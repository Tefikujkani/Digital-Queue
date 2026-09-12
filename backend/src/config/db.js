import dns from 'node:dns'
import { Resolver } from 'node:dns/promises'
import mongoose from 'mongoose'

dns.setDefaultResultOrder('ipv4first')

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  family: 4,
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function isSrvLookupError(error) {
  return /querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT|ENODATA/i.test(error?.message || '')
}

async function standardUriFromSrv(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return null

  const parsed = new URL(uri.replace('mongodb+srv://', 'https://'))
  const resolver = new Resolver()
  resolver.setServers(['8.8.8.8', '1.1.1.1'])

  const records = await resolver.resolveSrv(`_mongodb._tcp.${parsed.hostname}`)
  if (!records.length) return null

  const hosts = records.map((r) => `${r.name}:${r.port}`).join(',')
  const auth = parsed.username
    ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`
    : ''
  const params = new URLSearchParams(parsed.search)
  params.set('ssl', 'true')
  if (!params.has('retryWrites')) params.set('retryWrites', 'true')
  if (!params.has('w')) params.set('w', 'majority')
  if (!params.has('authSource')) params.set('authSource', 'admin')

  return `mongodb://${auth}${hosts}${parsed.pathname || '/'}?${params.toString()}`
}

async function connectOnce(uri) {
  try {
    return await mongoose.connect(uri, CONNECT_OPTIONS)
  } catch (error) {
    if (!isSrvLookupError(error)) throw error

    const fallbackUri = await standardUriFromSrv(uri).catch(() => null)
    if (!fallbackUri) throw error

    console.warn('⚠️ MongoDB SRV DNS failed, retrying with standard host list')
    return mongoose.connect(fallbackUri, CONNECT_OPTIONS)
  }
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌ MONGODB_URI mungon — shtoje në backend/.env')
    process.exit(1)
  }

  const attempts = 3
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const conn = await connectOnce(uri)
      console.log(`📡 MongoDB Connected: ${conn.connection.host}`)
      return conn
    } catch (error) {
      lastError = error
      console.error(`❌ MongoDB attempt ${attempt}/${attempts}: ${error.message}`)
      if (attempt < attempts) await sleep(1000 * attempt)
    }
  }

  console.error(`❌ Error: ${lastError.message}`)
  process.exit(1)
}

export default connectDB

import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromPhone = process.env.TWILIO_PHONE_NUMBER
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

const client = (accountSid && authToken && !accountSid.includes('your_')) 
  ? twilio(accountSid, authToken) 
  : null;

if (!client) {
  console.warn('⚠️ Twilio Client nuk u inicializua. Kontrolloni .env');
}

/**
 * Funksioni për dërgimin e SMS
 * Me rregullim automatik të numrit për Kosovë/Shqipëri
 */
export const sendSMS = async (to, body) => {
  if (!client || !accountSid || accountSid.includes('your_account_sid')) {
    console.warn('⚠️ Twilio nuk është konfiguruar saktë në .env')
    return { success: false, reason: 'Twilio not configured' }
  }

  // RREGULLIMI I NUMRIT (E.164 format)
  let formattedNumber = to.trim().replace(/\s+/g, '')
  
  if (!formattedNumber.startsWith('+')) {
    if (formattedNumber.startsWith('00')) {
      formattedNumber = '+' + formattedNumber.substring(2)
    } else if (formattedNumber.startsWith('0')) {
      // Nëse fillon me 0, nënkuptojmë Kosovën (+383)
      formattedNumber = '+383' + formattedNumber.substring(1)
    } else if (formattedNumber.length === 8 || formattedNumber.length === 9) {
      // Nëse është numër pa 0 fare
      formattedNumber = '+383' + formattedNumber
    } else {
      formattedNumber = '+' + formattedNumber
    }
  }

  console.log(`📱 Duke dërguar SMS te: ${formattedNumber}`)

  const messageOptions = {
    body: body,
    to: formattedNumber
  }

  // Përdor Messaging Service SID si prioritet i parë, pastaj numrin From
  if (messagingServiceSid && !messagingServiceSid.includes('your_')) {
    messageOptions.messagingServiceSid = messagingServiceSid
  } else if (fromPhone && !fromPhone.includes('your_')) {
    messageOptions.from = fromPhone
  }

  return client.messages.create(messageOptions)
    .then(message => {
      console.log(`✅ SMS u dërgua me sukses! SID: ${message.sid}`)
      return { success: true, sid: message.sid }
    })
    .catch(err => {
      console.error(`❌ Twilio Error (${formattedNumber}): ${err.message}`)
      return { success: false, error: err.message }
    })
}

export default { sendSMS }
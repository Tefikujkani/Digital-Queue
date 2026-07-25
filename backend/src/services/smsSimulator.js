/**
 * Shërbimi për simulimin e dërgimit të SMS
 * Ky shërbim nuk përdor API reale, por shfaq mesazhet në konsolë.
 */

export const simulateSMS = (userData) => {
  const { name, phone, institution, date, time } = userData;
  const message = `[SMS SIMULIM] Pershendetje ${name}, termi juaj tek ${institution} është konfirmuar për ${date} në ${time}. Dërguar tek ${phone}`;
  
  console.log('--------------------------------------------------');
  console.log(message);
  console.log('--------------------------------------------------');
  
  return {
    success: true,
    timestamp: new Date(),
    message: message
  };
};

/**
 * Dërgon mesazhe për disa përdorues njëherësh
 */
export const simulateBulkSMS = (appointments) => {
  console.log(`\n🚀 Duke filluar simulimin për ${appointments.length} termine...\n`);
  
  const results = appointments.map(app => simulateSMS(app));
  
  console.log(`\n✅ Simulimi përfundoi me sukses.\n`);
  return results;
};

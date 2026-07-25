import nodemailer from 'nodemailer';

// Create reusable transporter — Gmail App Password or any SMTP
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('⚠️ Email nuk është konfiguruar. Vendos SMTP_USER dhe SMTP_PASS në .env');
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });
};

const transporter = createTransporter();

/**
 * Dërgon email njoftimi
 */
export const sendEmail = async (to, subject, htmlContent) => {
  if (!transporter) {
    console.warn('⚠️ Email transporter nuk është i gatshëm');
    return { success: false, reason: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SmartQueue Kosova" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Email u dërgua te ${to} — ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Email Error: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Template: Bileta e re
 */
export const ticketIssuedEmail = (userName, ticketNumber, institutionName, scheduledAt, serviceName) => {
  const dateStr = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString('sq-SQ', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('sq-SQ', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const timeStr = scheduledAt 
    ? new Date(scheduledAt).toLocaleTimeString('sq-SQ', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('sq-SQ', { hour: '2-digit', minute: '2-digit' });

  return {
    subject: `🎫 Bileta ${ticketNumber} — ${institutionName}`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
        
        <!-- Main Ticket Container -->
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); padding: 30px 20px; color: #ffffff;">
            <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">SmartQueue Kosova</p>
            <h1 style="margin: 10px 0 0 0; font-size: 28px; font-weight: 800;">Bileta Juaj Elektronike</h1>
          </div>
          
          <!-- Ticket Body -->
          <div style="padding: 30px 40px;">
            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; text-align: left;">
              Përshëndetje <strong>${userName}</strong>, <br/>Termini juaj është konfirmuar me sukses.
            </p>
            
            <!-- Number Display -->
            <div style="margin: 30px 0; padding: 25px 0; border: 2px dashed #e5e7eb; border-radius: 16px; background-color: #f9fafb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-transform: uppercase; font-weight: 600;">Numri i Biletës</p>
              <h2 style="margin: 10px 0 0 0; color: #6c5ce7; font-size: 56px; font-weight: 900; letter-spacing: 2px;">${ticketNumber}</h2>
            </div>
            
            <!-- Details Grid -->
            <div style="text-align: left; margin-bottom: 30px;">
              <div style="margin-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Institucioni</p>
                <p style="margin: 4px 0 0 0; font-size: 18px; color: #1f2937; font-weight: 600;">${institutionName}</p>
              </div>
              
              <div style="margin-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Shërbimi</p>
                <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151; font-weight: 500;">${serviceName || 'Shërbim i Përgjithshëm'}</p>
              </div>
              
              <div style="display: table; width: 100%; margin-top: 20px;">
                <div style="display: table-cell; width: 50%;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Data</p>
                  <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151; font-weight: 600;">${dateStr}</p>
                </div>
                <div style="display: table-cell; width: 50%;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: 600;">Ora</p>
                  <p style="margin: 4px 0 0 0; font-size: 16px; color: #374151; font-weight: 600;">${timeStr}</p>
                </div>
              </div>
            </div>
            
          </div>
          
          <!-- Footer / Tear Line -->
          <div style="position: relative; border-top: 2px dashed #e5e7eb; padding: 25px; background-color: #f9fafb;">
            <!-- Semi-circles for ticket tear effect -->
            <div style="position: absolute; top: -15px; left: -15px; width: 30px; height: 30px; background-color: #f3f4f6; border-radius: 50%;"></div>
            <div style="position: absolute; top: -15px; right: -15px; width: 30px; height: 30px; background-color: #f3f4f6; border-radius: 50%;"></div>
            
            <p style="margin: 0; color: #6b7280; font-size: 13px;">Ju lutemi paraqituni në institucion <strong>10 minuta</strong> para kohës së caktuar.</p>
            <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 11px;">Kjo është një biletë elektronike. Tregojeni nga telefoni juaj kur të thirret numri.</p>
          </div>
          
        </div>
        
        <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} SmartQueue Kosova. Të gjitha të drejtat e rezervuara.</p>
      </div>
    `
  };
};

/**
 * Template: Bileta u thirr
 */
export const ticketCalledEmail = (userName, ticketNumber, counterName) => {
  return {
    subject: `📢 Radha juaj — Bileta ${ticketNumber}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto; background: #f5f5f7; border-radius: 16px; overflow: hidden;">
        <div style="background: #00b894; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Radha Juaj!</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">I/e nderuar <strong>${userName}</strong>,</p>
          <p style="color: #666; font-size: 18px;">Numri juaj <strong style="color: #6c5ce7; font-size: 24px;">${ticketNumber}</strong> u thirr!</p>
          
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 2px solid #00b894;">
            <p style="color: #333; font-size: 18px; margin: 0;">Drejtohuni te <strong>${counterName || 'Sporteli'}</strong></p>
          </div>

          <p style="color: #999; font-size: 12px;">— SmartQueue Kosova</p>
        </div>
      </div>
    `
  };
};

/**
 * Template: Shërbimi u përfundua
 */
export const ticketCompletedEmail = (userName, ticketNumber) => {
  return {
    subject: `✅ Shërbimi u krye — Bileta ${ticketNumber}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto; background: #f5f5f7; border-radius: 16px; overflow: hidden;">
        <div style="background: #6c5ce7; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Faleminderit!</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px;">I/e nderuar <strong>${userName}</strong>,</p>
          <p style="color: #666;">Shërbimi me biletën <strong>${ticketNumber}</strong> u përfundua me sukses.</p>
          <p style="color: #666;">Na vizitoni sërish përmes SmartQueue Kosova!</p>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">— SmartQueue Kosova Team</p>
        </div>
      </div>
    `
  };
};

export default { sendEmail, ticketIssuedEmail, ticketCalledEmail, ticketCompletedEmail };

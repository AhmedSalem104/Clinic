const repository = require('../modules/notifications/notification.repository');
const { env } = require('../config/env');

class WhatsAppLinkProvider {
  build(recipient, message) {
    const phone = String(recipient || '').replace(/\D/g, '');
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
  }
}

class WhatsAppApiProvider {
  async send() { throw new Error('WhatsApp Business API provider is not configured.'); }
}

class SmsProvider {
  async send() { throw new Error('SMS provider is not configured.'); }
}

const whatsappLinks = new WhatsAppLinkProvider();

const enqueueBookingConfirmed = async (appointment) => {
  if (!appointment?.Phone) return null;
  const trackingUrl = appointment.PublicTrackingToken ? `${env.appOrigin}/queue-tracking.html?token=${appointment.PublicTrackingToken}` : null;
  const message = `Booking confirmed with ${appointment.DoctorName} for ${new Date(appointment.StartAt).toLocaleString('en-GB')}. Service: ${appointment.ServiceName}.${trackingUrl ? ` Follow your queue: ${trackingUrl}` : ''}`;
  const notification = await repository.create({ patientId: appointment.PatientId, appointmentId: appointment.Id, channel: 'whatsapp', eventType: 'booking_confirmed', recipient: appointment.Phone, message, status: 'queued' });
  return { notification, link: whatsappLinks.build(appointment.Phone, message) };
};

module.exports = { WhatsAppLinkProvider, WhatsAppApiProvider, SmsProvider, enqueueBookingConfirmed, whatsappLinks };

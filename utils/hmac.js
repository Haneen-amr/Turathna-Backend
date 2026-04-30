const crypto = require("crypto");

function verifyHmac(obj, hmacFromPaymob, secret) {
  // الترتيب ده إجباري من ديسكربشن بي موب عشان الـ Hash يطلع صح
  const concatenatedString =
    obj.amount_cents +
    obj.created_at +
    obj.currency +
    obj.error_occured +
    obj.has_parent_transaction +
    obj.id +
    obj.integration_id +
    obj.is_3d_secure +
    obj.is_auth +
    obj.is_capture +
    obj.is_refunded +
    obj.is_standalone_payment +
    obj.is_voided +
    obj.order.id +
    obj.owner +
    obj.pending +
    obj.source_data.pan +
    obj.source_data.sub_type +
    obj.source_data.type +
    obj.success;

  const hash = crypto
    .createHmac("sha512", secret)
    .update(concatenatedString)
    .digest("hex");

  return hash === hmacFromPaymob;
}

module.exports = verifyHmac;

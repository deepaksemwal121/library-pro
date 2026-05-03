export const getEndOfMonth = (dateValue) => {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export const getPaymentStatus = (paidUntilValue) => {
  if (!paidUntilValue) {
    return {
      label: "Due date passed",
      tone: "red",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paidUntil = new Date(`${paidUntilValue}T00:00:00`);

  if (paidUntil >= today) {
    return {
      label: "Paid",
      tone: "green",
    };
  }

  const daysSinceDue = Math.floor((today - paidUntil) / (1000 * 60 * 60 * 24));

  if (daysSinceDue <= 7) {
    return {
      label: "Payment due",
      tone: "yellow",
    };
  }

  return {
    label: "Due date passed",
    tone: "red",
  };
};

export const mapMemberFromDb = (member) => ({
  id: member.id,
  fullName: member.full_name,
  dateOfBirth: member.date_of_birth,
  phoneNumber: member.phone_number,
  idType: member.id_type,
  idNumber: member.id_number,
  registrationDate: member.registration_date,
  isLockerTaken: member.locker_taken,
  seatNumber: member.seat_number,
  seatFloor: member.seat_floor,
  feeAmount: member.fee_amount,
  paymentMethod: member.payment_method,
  transactionNotes: member.transaction_notes,
  paidUntil: member.paid_until,
  memberStatus: member.member_status,
  leftAt: member.left_at,
  lockerSecurityRefunded: member.locker_security_refunded,
  lockerKeysReturned: member.locker_keys_returned,
  exitNotes: member.exit_notes,
});

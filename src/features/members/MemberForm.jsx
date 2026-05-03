import React, { useMemo, useState } from "react";
import supabase from "../../../helpers/supabase";
import { SeatManagement } from "../seatmanagement/SeatManagement";
import { getSeatBaseFeeFromSettings } from "../seatmanagement/seatSettings";
import { getEndOfMonth } from "./memberUtils";

const LOCKER_FEE = 500;

const isAfterMidMonth = (dateValue) => {
  if (!dateValue) return false;

  const date = new Date(`${dateValue}T00:00:00`);
  return date.getDate() > 15;
};

const calculateSuggestedFee = (seatNumber, lockerTaken, registrationDate, seatBaseFee) => {
  if (!seatNumber) return "";

  const baseFee = Number(seatBaseFee) || getSeatBaseFeeFromSettings(seatNumber);
  const seatFee = isAfterMidMonth(registrationDate) ? baseFee / 2 : baseFee;
  const lockerFee = lockerTaken ? LOCKER_FEE : 0;

  return seatFee + lockerFee;
};

const initialFormData = {
  fullName: "",
  dateOfBirth: "",
  phoneNumber: "",
  idType: "Aadhar",
  idNumber: "",
  registrationDate: "",
  lockerTaken: false,
  seatNumber: "",
  seatFloor: "",
  seatBaseFee: "",
  feeAmount: "",
  paymentMethod: "Cash",
  transactionNotes: "",
};

export const MemberForm = ({ occupiedSeats = [], occupiedMembers = [], onMemberCreated = () => {} }) => {
  const [formData, setFormData] = useState({
    ...initialFormData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [formVersion, setFormVersion] = useState(0);

  const feeBreakdown = useMemo(() => {
    if (!formData.seatNumber) {
      return null;
    }

    const baseFee = Number(formData.seatBaseFee) || getSeatBaseFeeFromSettings(formData.seatNumber);
    const midMonthDiscount = isAfterMidMonth(formData.registrationDate);
    const seatFee = midMonthDiscount ? baseFee / 2 : baseFee;
    const lockerFee = formData.lockerTaken ? LOCKER_FEE : 0;

    return {
      baseFee,
      seatFee,
      lockerFee,
      midMonthDiscount,
    };
  }, [formData.lockerTaken, formData.registrationDate, formData.seatBaseFee, formData.seatNumber]);

  const withSuggestedFee = (data) => ({
    ...data,
    feeAmount: calculateSuggestedFee(data.seatNumber, data.lockerTaken, data.registrationDate, data.seatBaseFee),
  });

  const handleSeatPick = ({ seatNumber, floor, baseFee }) => {
    setFormData((prev) =>
      withSuggestedFee({
        ...prev,
        seatNumber,
        seatFloor: floor,
        seatBaseFee: baseFee,
      }),
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "lockerTaken" || name === "registrationDate") {
        return withSuggestedFee(next);
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!formData.seatNumber) {
      setSubmitError("Please select a seat before submitting.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("library_members")
      .insert({
        full_name: formData.fullName,
        date_of_birth: formData.dateOfBirth || null,
        phone_number: formData.phoneNumber,
        id_type: formData.idType,
        id_number: formData.idNumber,
        registration_date: formData.registrationDate,
        locker_taken: formData.lockerTaken,
        seat_number: formData.seatNumber,
        seat_floor: formData.seatFloor,
        fee_amount: Number(formData.feeAmount),
        payment_method: formData.paymentMethod,
        transaction_notes: formData.transactionNotes || null,
        paid_until: getEndOfMonth(formData.registrationDate),
      })
      .select("id")
      .single();

    if (error) {
      setIsSubmitting(false);
      if (error.code === "23505") {
        setSubmitError("This seat is already occupied. Please select another seat.");
        return;
      }
      setSubmitError(error.message);
      return;
    }

    // Record the registration fee payment
    const registrationFeeAmount = Number(formData.feeAmount);
    const { error: paymentError } = await supabase.from("payment_history").insert({
      member_id: data.id,
      amount: registrationFeeAmount,
      payment_for_month: formData.registrationDate,
      payment_method: formData.paymentMethod,
      payment_type: "Registration Fee",
      transaction_notes: formData.transactionNotes ? `Registration: ${formData.transactionNotes}` : "Registration Fee",
    });

    // Record locker security deposit if locker is taken
    if (formData.lockerTaken) {
      const LOCKER_SECURITY = 500;
      const { error: lockerPaymentError } = await supabase.from("payment_history").insert({
        member_id: data.id,
        amount: LOCKER_SECURITY,
        payment_for_month: formData.registrationDate,
        payment_method: formData.paymentMethod,
        payment_type: "Locker Security",
        transaction_notes: "Locker Security Deposit - Refundable",
      });

      if (lockerPaymentError) {
        console.error("Failed to record locker security deposit:", lockerPaymentError);
      }
    }

    setIsSubmitting(false);

    if (paymentError) {
      setSubmitError(`Member created but failed to record payment: ${paymentError.message}`);
      setFormData({ ...initialFormData });
      setFormVersion((version) => version + 1);
      onMemberCreated();
      return;
    }

    setSubmitSuccess("Member registered successfully and payment recorded.");
    setFormData({ ...initialFormData });
    setFormVersion((version) => version + 1);
    onMemberCreated();
  };

  return (
    <div className="mx-auto max-w-3xl bg-white p-0 sm:p-2">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {submitError && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
        {submitSuccess && <div className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{submitSuccess}</div>}
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            className="w-full border rounded-md p-2 outline-blue-500"
            placeholder="Enter full name"
          />
        </div>

        {/* Personal Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              className="w-full border rounded-md p-2 outline-blue-500"
              placeholder="Enter phone number"
            />
          </div>
        </div>

        {/* ID Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
            <select name="idType" value={formData.idType} onChange={handleChange} className="w-full border rounded-md p-2 bg-white">
              <option>Aadhar</option>
              <option>PAN</option>
              <option>Passport</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
            <input
              type="text"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              required
              className="w-full border rounded-md p-2 outline-blue-500"
              placeholder="Number"
            />
          </div>
        </div>

        {/* Date and Locker */}
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
            <input
              type="date"
              name="registrationDate"
              value={formData.registrationDate}
              onChange={handleChange}
              required
              className="w-full border rounded-md p-2"
            />
          </div>
          <div className="flex items-center pb-3">
            <input
              checked={formData.lockerTaken}
              onChange={handleChange}
              type="checkbox"
              name="lockerTaken"
              id="locker"
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="locker" className="ml-2 text-sm text-gray-700">
              Locker Taken
            </label>
          </div>
        </div>

        <div className="pt-4 border-t mt-4 space-y-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Seat</label>
            <SeatManagement
              key={formVersion}
              onSeatSelect={handleSeatPick}
              isLockerChecked={formData.lockerTaken}
              occupiedSeats={occupiedSeats}
              occupiedMembers={occupiedMembers}
              allowConfiguration={false}
            />
          </div>

          {formData.seatNumber && (
            <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Seat {formData.seatNumber} selected on {formData.seatFloor} floor.
            </div>
          )}
        </div>

        {/* Billing Section */}
        <div className="pt-4 border-t mt-4 space-y-4">
          {feeBreakdown && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div>Seat fee: Rs.{feeBreakdown.seatFee}</div>
              {feeBreakdown.midMonthDiscount && <div>Mid-month joining applied: half seat fee charged after the 15th.</div>}
              <div>Locker fee: Rs.{feeBreakdown.lockerFee}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Fee Amount (Rs.)</label>
              <input
                type="number"
                name="feeAmount"
                value={formData.feeAmount}
                onChange={handleChange}
                required
                className="w-full border rounded-md p-2 border-green-200 bg-green-50 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment via</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full border rounded-md p-2 bg-white"
              >
                <option>Cash</option>
                <option>Online</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Notes</label>
            <input
              type="text"
              name="transactionNotes"
              value={formData.transactionNotes}
              onChange={handleChange}
              className="w-full border rounded-md p-2 outline-blue-500"
              placeholder="Enter transaction notes"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-md mt-6 transition duration-200"
        >
          {isSubmitting ? "Registering..." : "Submit Registration"}
        </button>
      </form>
    </div>
  );
};

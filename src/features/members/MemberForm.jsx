import React, { useMemo, useState } from "react";
import { Camera, FolderOpen, LoaderCircle } from "lucide-react";
import supabase from "../../../helpers/supabase";
import { SeatManagement } from "../seatmanagement/SeatManagement";
import { getSeatBaseFeeFromSettings } from "../seatmanagement/seatSettings";
import { useToast } from "../../components/ui/toastContext";
import { uploadMemberFile } from "./memberFiles";
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
  registeredEmail: "",
  idType: "Aadhar",
  idNumber: "",
  registrationDate: "",
  isFreeTier: false,
  lockerTaken: false,
  seatNumber: "",
  seatFloor: "",
  seatBaseFee: "",
  feeAmount: "",
  paymentMethod: "Cash",
  transactionNotes: "",
};

export const MemberForm = ({ occupiedSeats = [], occupiedMembers = [], onMemberCreated = () => {} }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    ...initialFormData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [idDocumentFile, setIdDocumentFile] = useState(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState(null);

  const feeBreakdown = useMemo(() => {
    if (!formData.seatNumber) {
      return null;
    }

    const baseFee = Number(formData.seatBaseFee) || getSeatBaseFeeFromSettings(formData.seatNumber);
    const midMonthDiscount = isAfterMidMonth(formData.registrationDate);
    const seatFee = formData.isFreeTier ? 0 : midMonthDiscount ? baseFee / 2 : baseFee;
    const lockerFee = formData.isFreeTier ? 0 : formData.lockerTaken ? LOCKER_FEE : 0;

    return {
      baseFee,
      seatFee,
      lockerFee,
      midMonthDiscount,
    };
  }, [formData.isFreeTier, formData.lockerTaken, formData.registrationDate, formData.seatBaseFee, formData.seatNumber]);

  const withSuggestedFee = (data) => ({
    ...data,
    feeAmount: data.isFreeTier ? 0 : calculateSuggestedFee(data.seatNumber, data.lockerTaken, data.registrationDate, data.seatBaseFee),
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

      if (name === "isFreeTier" || name === "lockerTaken" || name === "registrationDate") {
        return withSuggestedFee(next);
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.seatNumber) {
      toast.warning("Select a seat", { message: "Please select a seat before submitting." });
      return;
    }

    if (!idDocumentFile) {
      toast.warning("ID document required", { message: "Please upload the member's ID document photo before submitting." });
      return;
    }

    setIsSubmitting(true);
    toast.info("Registering member", { message: "Uploading documents and saving the member record.", duration: 2500 });

    const memberId = crypto.randomUUID();
    let idDocumentPath = "";
    let passportPhotoPath = "";

    try {
      idDocumentPath = await uploadMemberFile(memberId, idDocumentFile, "id-document");
      passportPhotoPath = await uploadMemberFile(memberId, passportPhotoFile, "passport-photo");
    } catch (error) {
      setIsSubmitting(false);
      toast.error("Could not upload member document", { message: error.message });
      return;
    }

    const { data, error } = await supabase
      .from("library_members")
      .insert({
        id: memberId,
        full_name: formData.fullName,
        date_of_birth: formData.dateOfBirth || null,
        phone_number: formData.phoneNumber,
        registered_email: formData.registeredEmail || null,
        id_type: formData.idType,
        id_number: formData.idNumber,
        registration_date: formData.registrationDate,
        is_free_tier: formData.isFreeTier,
        locker_taken: formData.lockerTaken,
        seat_number: formData.seatNumber,
        seat_floor: formData.seatFloor,
        fee_amount: formData.isFreeTier ? 0 : Number(formData.feeAmount),
        payment_method: formData.paymentMethod,
        transaction_notes: formData.transactionNotes || null,
        paid_until: getEndOfMonth(formData.registrationDate),
        id_document_path: idDocumentPath,
        passport_photo_path: passportPhotoPath,
      })
      .select("id")
      .single();

    if (error) {
      setIsSubmitting(false);
      if (error.code === "23505") {
        toast.error("Seat already occupied", { message: "This seat is already occupied. Please select another seat." });
        return;
      }
      toast.error("Could not register member", { message: error.message });
      return;
    }

    if (formData.isFreeTier) {
      setIsSubmitting(false);
      toast.success("Free tier member registered", { message: "No payment was recorded for this member." });
      setFormData({ ...initialFormData });
      setIdDocumentFile(null);
      setPassportPhotoFile(null);
      setFormVersion((version) => version + 1);
      onMemberCreated();
      return;
    }

    const totalRegistrationAmount = Number(formData.feeAmount);
    const lockerFeeAmount = formData.lockerTaken ? LOCKER_FEE : 0;
    const monthlyFeeAmount = totalRegistrationAmount - lockerFeeAmount;

    if (monthlyFeeAmount < 0) {
      setIsSubmitting(false);
      toast.error("Invalid fee amount", { message: "Fee amount cannot be less than the locker fee." });
      return;
    }

    const paymentRecords = [
      {
        member_id: data.id,
        amount: monthlyFeeAmount,
        payment_for_month: formData.registrationDate,
        payment_method: formData.paymentMethod,
        payment_type: "Monthly Fee",
        transaction_notes: formData.transactionNotes
          ? `Registration monthly fee: ${formData.transactionNotes}`
          : "Registration monthly fee",
      },
    ];

    if (formData.lockerTaken) {
      paymentRecords.push({
        member_id: data.id,
        amount: lockerFeeAmount,
        payment_for_month: formData.registrationDate,
        payment_method: formData.paymentMethod,
        payment_type: "Locker Fee",
        transaction_notes: "Registration locker fee",
      });
    }

    const { error: paymentError } = await supabase.from("payment_history").insert(paymentRecords);

    setIsSubmitting(false);

    if (paymentError) {
      toast.warning("Member created, payment not recorded", { message: paymentError.message, duration: 7500 });
      setFormData({ ...initialFormData });
      setFormVersion((version) => version + 1);
      onMemberCreated();
      return;
    }

    toast.success("Member registered", { message: "Payment records were created successfully." });
    setFormData({ ...initialFormData });
    setIdDocumentFile(null);
    setPassportPhotoFile(null);
    setFormVersion((version) => version + 1);
    onMemberCreated();
  };

  return (
    <div className="mx-auto max-w-3xl bg-white p-0 sm:p-2">
      <form className="space-y-4" onSubmit={handleSubmit}>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registered Email</label>
            <input
              type="email"
              name="registeredEmail"
              value={formData.registeredEmail}
              onChange={handleChange}
              className="w-full border rounded-md p-2 outline-blue-500"
              placeholder="member@example.com"
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

        <label className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <input
            checked={formData.isFreeTier}
            onChange={handleChange}
            type="checkbox"
            name="isFreeTier"
            className="mt-0.5 h-4 w-4 rounded text-emerald-600"
          />
          <span>
            <span className="block font-semibold">Free tier member</span>
            <span className="text-emerald-700">No registration, monthly, or locker fee will be recorded for this member.</span>
          </span>
        </label>

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
              {formData.isFreeTier && <div className="font-semibold text-emerald-700">Free tier applied: total payable is Rs.0.</div>}
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
                disabled={formData.isFreeTier}
                className="w-full border rounded-md p-2 border-green-200 bg-green-50 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment via</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                disabled={formData.isFreeTier}
                className="w-full border rounded-md p-2 bg-white disabled:cursor-not-allowed disabled:opacity-70"
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

        <div className="pt-4 border-t mt-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ID Document Photo</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                htmlFor={`id-document-camera-${formVersion}`}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <Camera size={16} />
                Take Photo
              </label>
              <input
                key={`id-document-camera-${formVersion}`}
                id={`id-document-camera-${formVersion}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setIdDocumentFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <label
                htmlFor={`id-document-file-${formVersion}`}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FolderOpen size={16} />
                Choose File
              </label>
              <input
                key={`id-document-file-${formVersion}`}
                id={`id-document-file-${formVersion}`}
                type="file"
                accept="image/*"
                onChange={(event) => setIdDocumentFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </div>
            {idDocumentFile && <p className="mt-1 truncate text-xs font-medium text-slate-600">Selected: {idDocumentFile.name}</p>}
            <p className="mt-1 text-xs text-red-700">Required for every new member registration. Use camera or choose an existing image.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Passport Size Photo</label>
            <input
              key={`passport-photo-${formVersion}`}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => setPassportPhotoFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Optional. A fallback photo will be shown if this is not uploaded. Tap to use selfie camera on mobile/tablet.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-600 py-3 font-bold text-white transition duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
        >
          {isSubmitting && <LoaderCircle size={18} className="animate-spin" />}
          {isSubmitting ? "Registering member..." : "Submit Registration"}
        </button>
      </form>
    </div>
  );
};

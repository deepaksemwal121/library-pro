import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter } from "lucide-react";
import { SearchBar } from "../../components/ui/SearchBar";
import supabase from "../../../helpers/supabase";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberForm } from "./MemberForm";
import { MembersTable } from "./MembersTable";
import { mapMemberFromDb, getPaymentStatus } from "./memberUtils";
import { exportMembersToExcel } from "./memberExport";

const loadActiveMembers = async () => {
  const { data, error } = await supabase
    .from("library_members")
    .select("*")
    .eq("member_status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(mapMemberFromDb);
};

export const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(null); // null means show all

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      setMembers(await loadActiveMembers());
    } catch (error) {
      setErrorMessage(error.message);
      setMembers([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchInitialMembers = async () => {
      try {
        const loadedMembers = await loadActiveMembers();

        if (!ignore) {
          setMembers(loadedMembers);
          setErrorMessage("");
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
          setMembers([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchInitialMembers();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSaveMember = async (memberId, formData) => {
    setErrorMessage("");

    const { error } = await supabase
      .from("library_members")
      .update({
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
        paid_until: formData.paidUntil,
      })
      .eq("id", memberId);

    if (error) {
      if (error.code === "23505") {
        setErrorMessage("That seat is already occupied by another active member.");
        return false;
      }

      setErrorMessage(error.message);
      return false;
    }

    fetchMembers();
    return true;
  };

  const handleMarkLeft = async (memberId, leftData) => {
    setErrorMessage("");

    const member = members.find((item) => item.id === memberId);

    if (member?.isLockerTaken && (!leftData.lockerSecurityRefunded || !leftData.lockerKeysReturned)) {
      setErrorMessage("Before removing this member, mark locker security refunded and locker keys submitted.");
      return false;
    }

    const { error } = await supabase
      .from("library_members")
      .update({
        member_status: "inactive",
        left_at: leftData.leftAt,
        locker_security_refunded: Boolean(leftData.lockerSecurityRefunded),
        locker_keys_returned: Boolean(leftData.lockerKeysReturned),
        exit_notes: leftData.exitNotes || null,
      })
      .eq("id", memberId);

    if (error) {
      setErrorMessage(error.message);
      return false;
    }

    fetchMembers();
    return true;
  };

  const occupiedSeats = useMemo(() => members.map((member) => member.seatNumber), [members]);
  const filteredMembers = useMemo(() => {
    let result = members;

    // Apply search filter
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter((member) =>
        [member.fullName, member.phoneNumber, member.seatNumber, member.seatFloor, member.idNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
      );
    }

    // Apply payment status filter
    if (paymentStatusFilter) {
      result = result.filter((member) => {
        const status = getPaymentStatus(member.paidUntil);
        return status.tone === paymentStatusFilter;
      });
    }

    return result;
  }, [members, searchQuery, paymentStatusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-2xl font-bold">Members Management</h2>
        <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto">
          <SearchBar placeholder={"Search Member"} value={searchQuery} onChange={setSearchQuery} />
          <AddMemberDialog>
            <MemberForm occupiedSeats={occupiedSeats} occupiedMembers={members} onMemberCreated={fetchMembers} />
          </AddMemberDialog>
        </div>
      </div>

      {/* Payment Status Filter and Download */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-600" />
          <select
            value={paymentStatusFilter || "all"}
            onChange={(e) => setPaymentStatusFilter(e.target.value === "all" ? null : e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            <option value="all">All Members ({members.length})</option>
            <option value="green">✓ Paid ({members.filter((m) => getPaymentStatus(m.paidUntil).tone === "green").length})</option>
            <option value="yellow">⚠ Payment Due ({members.filter((m) => getPaymentStatus(m.paidUntil).tone === "yellow").length})</option>
            <option value="red">✗ Due Date Passed ({members.filter((m) => getPaymentStatus(m.paidUntil).tone === "red").length})</option>
          </select>
        </div>
        <button
          onClick={() => exportMembersToExcel(filteredMembers)}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Download size={18} />
          Download Excel
        </button>
      </div>

      {errorMessage && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}
      <MembersTable
        members={filteredMembers}
        loading={loading}
        emptyMessage={
          searchQuery.trim()
            ? "No members match your search."
            : paymentStatusFilter
              ? "No members with this payment status."
              : "No members registered yet."
        }
        onSaveMember={handleSaveMember}
        onMarkLeft={handleMarkLeft}
      />
    </div>
  );
};

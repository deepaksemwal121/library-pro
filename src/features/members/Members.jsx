import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, UserCheck, UserX } from "lucide-react";
import { SearchBar } from "../../components/ui/SearchBar";
import supabase from "../../../helpers/supabase";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberForm } from "./MemberForm";
import { MembersTable } from "./MembersTable";
import { uploadMemberFile } from "./memberFiles";
import { recordSeatHistory } from "./memberSeatHistory";
import { mapMemberFromDb, getPaymentStatus } from "./memberUtils";
import { exportMembersToExcel } from "./memberExport";

const loadMembersByStatus = async (status) => {
  const { data, error } = await supabase
    .from("library_members")
    .select("*")
    .eq("member_status", status)
    .order(status === "inactive" ? "left_at" : "created_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data.map(mapMemberFromDb);
};

export const Members = () => {
  const [activeMembers, setActiveMembers] = useState([]);
  const [leftMembers, setLeftMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [memberView, setMemberView] = useState("active");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(null); // null means show all

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [loadedActiveMembers, loadedLeftMembers] = await Promise.all([
        loadMembersByStatus("active"),
        loadMembersByStatus("inactive"),
      ]);
      setActiveMembers(loadedActiveMembers);
      setLeftMembers(loadedLeftMembers);
    } catch (error) {
      setErrorMessage(error.message);
      setActiveMembers([]);
      setLeftMembers([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchInitialMembers = async () => {
      try {
        const [loadedActiveMembers, loadedLeftMembers] = await Promise.all([
          loadMembersByStatus("active"),
          loadMembersByStatus("inactive"),
        ]);

        if (!ignore) {
          setActiveMembers(loadedActiveMembers);
          setLeftMembers(loadedLeftMembers);
          setErrorMessage("");
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
          setActiveMembers([]);
          setLeftMembers([]);
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
    const existingMember = [...activeMembers, ...leftMembers].find((member) => member.id === memberId);
    const hasSeatChanged =
      String(existingMember?.seatNumber ?? "") !== String(formData.seatNumber ?? "") ||
      String(existingMember?.seatFloor ?? "") !== String(formData.seatFloor ?? "");

    let idDocumentPath = formData.idDocumentPath;
    let passportPhotoPath = formData.passportPhotoPath;

    try {
      if (formData.idDocumentFile) {
        idDocumentPath = await uploadMemberFile(memberId, formData.idDocumentFile, "id-document");
      }

      if (formData.passportPhotoFile) {
        passportPhotoPath = await uploadMemberFile(memberId, formData.passportPhotoFile, "passport-photo");
      }
    } catch (error) {
      setErrorMessage(`Could not upload member photo document: ${error.message}`);
      return false;
    }

    const { error } = await supabase
      .from("library_members")
      .update({
        full_name: formData.fullName,
        date_of_birth: formData.dateOfBirth || null,
        phone_number: formData.phoneNumber,
        registered_email: formData.registeredEmail || null,
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
        id_document_path: idDocumentPath || null,
        passport_photo_path: passportPhotoPath || null,
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

    if (hasSeatChanged) {
      const { error: seatHistoryError } = await recordSeatHistory({
        memberId,
        fromSeatNumber: existingMember?.seatNumber,
        fromSeatFloor: existingMember?.seatFloor,
        toSeatNumber: formData.seatNumber,
        toSeatFloor: formData.seatFloor,
        reason: formData.transactionNotes || "Seat changed",
      });

      if (seatHistoryError) {
        setErrorMessage(`Member saved, but seat history was not recorded: ${seatHistoryError.message}`);
        fetchMembers();
        return false;
      }
    }

    fetchMembers();
    return true;
  };

  const handleMarkLeft = async (memberId, leftData) => {
    setErrorMessage("");

    const member = activeMembers.find((item) => item.id === memberId);

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

  const handleReactivateMember = async (memberId) => {
    setErrorMessage("");

    const member = leftMembers.find((item) => item.id === memberId);

    if (!member) {
      setErrorMessage("Could not find this left member.");
      return false;
    }

    const { error } = await supabase
      .from("library_members")
      .update({
        member_status: "active",
        left_at: null,
        exit_notes: null,
        locker_security_refunded: false,
        locker_keys_returned: false,
      })
      .eq("id", memberId);

    if (error) {
      if (error.code === "23505") {
        setErrorMessage(`Cannot reactivate ${member.fullName}: seat ${member.seatNumber} is already occupied by an active member.`);
        return false;
      }

      setErrorMessage(error.message);
      return false;
    }

    await fetchMembers();
    setMemberView("active");
    return true;
  };

  const members = memberView === "active" ? activeMembers : leftMembers;
  const occupiedSeats = useMemo(() => activeMembers.map((member) => member.seatNumber), [activeMembers]);
  const membersMissingIdDocument = useMemo(() => activeMembers.filter((member) => !member.idDocumentPath).length, [activeMembers]);
  const filteredMembers = useMemo(() => {
    let result = members;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter((member) =>
        [member.fullName, member.phoneNumber, member.registeredEmail, member.seatNumber, member.seatFloor, member.idNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
      );
    }

    // Apply payment status filter
    if (memberView === "active" && paymentStatusFilter) {
      result = result.filter((member) => {
        const status = getPaymentStatus(member.paidUntil, member);
        return status.tone === paymentStatusFilter;
      });
    }

    return result;
  }, [members, memberView, searchQuery, paymentStatusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-2xl font-bold">Members Management</h2>
        <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto">
          <SearchBar placeholder={"Search Member"} value={searchQuery} onChange={setSearchQuery} />
          {memberView === "active" && (
            <AddMemberDialog>
              <MemberForm occupiedSeats={occupiedSeats} occupiedMembers={activeMembers} onMemberCreated={fetchMembers} />
            </AddMemberDialog>
          )}
        </div>
      </div>

      <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
        {[
          { id: "active", label: "Active Members", count: activeMembers.length, icon: UserCheck },
          { id: "left", label: "Left Members", count: leftMembers.length, icon: UserX },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = memberView === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMemberView(tab.id);
                setPaymentStatusFilter(null);
              }}
              className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition ${
                isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/70"
              }`}
            >
              <Icon size={16} />
              {tab.label}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Payment Status Filter and Download */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {memberView === "active" ? (
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-600" />
            <select
              value={paymentStatusFilter || "all"}
              onChange={(e) => setPaymentStatusFilter(e.target.value === "all" ? null : e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              <option value="all">All Members ({activeMembers.length})</option>
              <option value="green">Paid ({activeMembers.filter((m) => getPaymentStatus(m.paidUntil, m).tone === "green").length})</option>
              <option value="yellow">
                Payment Due ({activeMembers.filter((m) => getPaymentStatus(m.paidUntil, m).tone === "yellow").length})
              </option>
              <option value="red">
                Due Date Passed ({activeMembers.filter((m) => getPaymentStatus(m.paidUntil, m).tone === "red").length})
              </option>
            </select>
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-600">Showing members marked left, including their exit details and history.</div>
        )}
        <button
          onClick={() => exportMembersToExcel(filteredMembers)}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Download size={18} />
          Export
        </button>
      </div>

      {errorMessage && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}
      {membersMissingIdDocument > 0 && (
        <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {membersMissingIdDocument} active member{membersMissingIdDocument === 1 ? "" : "s"} missing ID document upload. Open their details
          and use Edit Details to add it.
        </div>
      )}
      <MembersTable
        members={filteredMembers}
        loading={loading}
        emptyMessage={
          searchQuery.trim()
            ? "No members match your search."
            : memberView === "active" && paymentStatusFilter
              ? "No members with this payment status."
              : memberView === "left"
                ? "No left members recorded yet."
              : "No members registered yet."
        }
        viewMode={memberView}
        activeMembers={activeMembers}
        onSaveMember={handleSaveMember}
        onMarkLeft={handleMarkLeft}
        onReactivateMember={handleReactivateMember}
        onPaymentsChanged={fetchMembers}
      />
    </div>
  );
};

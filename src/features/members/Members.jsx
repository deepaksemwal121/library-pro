import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchBar } from "../../components/ui/SearchBar";
import supabase from "../../../helpers/supabase";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberForm } from "./MemberForm";
import { MembersTable } from "./MembersTable";
import { mapMemberFromDb } from "./memberUtils";

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

  const handleMarkPaid = async (memberId) => {
    const { error } = await supabase
      .from("library_members")
      .update({ paid_until: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) })
      .eq("id", memberId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    fetchMembers();
  };

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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Members Management</h2>
        <div className="grid grid-cols-2 gap-2 justify-between">
          <SearchBar placeholder={"Search Member"} />
          <AddMemberDialog>
            <MemberForm occupiedSeats={occupiedSeats} occupiedMembers={members} onMemberCreated={fetchMembers} />
          </AddMemberDialog>
        </div>
      </div>
      {errorMessage && <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}
      <MembersTable
        members={members}
        loading={loading}
        onMarkPaid={handleMarkPaid}
        onSaveMember={handleSaveMember}
        onMarkLeft={handleMarkLeft}
      />
    </div>
  );
};

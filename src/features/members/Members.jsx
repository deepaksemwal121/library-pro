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
      <MembersTable members={members} loading={loading} onMarkPaid={handleMarkPaid} />
    </div>
  );
};

import supabase from "../../../helpers/supabase";

export const loadMemberSeatHistory = async (memberId) => {
  if (!memberId) return [];

  const { data, error } = await supabase
    .from("member_seat_history")
    .select("*")
    .eq("member_id", memberId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const recordSeatHistory = async ({
  memberId,
  fromSeatNumber = null,
  fromSeatFloor = null,
  toSeatNumber,
  toSeatFloor,
  changedAt = new Date().toISOString(),
  reason = null,
}) => {
  if (!memberId || !toSeatNumber || !toSeatFloor) return { error: null };

  return supabase.from("member_seat_history").insert({
    member_id: memberId,
    from_seat_number: fromSeatNumber,
    from_seat_floor: fromSeatFloor,
    to_seat_number: toSeatNumber,
    to_seat_floor: toSeatFloor,
    changed_at: changedAt,
    reason,
  });
};

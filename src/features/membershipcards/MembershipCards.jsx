import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Mail, Search, Send, UserRound } from "lucide-react";
import supabase from "../../../helpers/supabase";
import { SearchBar } from "../../components/ui/SearchBar";
import { getMemberFileSignedUrl } from "../members/memberFiles";
import { mapMemberFromDb } from "../members/memberUtils";

let activeMembersCache = null;
let activeMembersLoadPromise = null;
const cardDataCache = new Map();
const cardDataLoadPromises = new Map();

const getCardDataCacheKey = (member) => `${member.id}:${member.passportPhotoPath || ""}`;

const clearCardDataForMember = (memberId) => {
  for (const key of cardDataCache.keys()) {
    if (key.startsWith(`${memberId}:`)) {
      cardDataCache.delete(key);
    }
  }
};

const loadActiveMembersFromSupabase = async () => {
  const { data, error } = await supabase
    .from("library_members")
    .select("*")
    .eq("member_status", "active")
    .order("full_name", { ascending: true });

  if (error) throw error;

  return data.map(mapMemberFromDb);
};

const loadActiveMembers = async ({ force = false } = {}) => {
  if (!force && activeMembersCache) return activeMembersCache;
  if (!force && activeMembersLoadPromise) return activeMembersLoadPromise;

  activeMembersLoadPromise = loadActiveMembersFromSupabase()
    .then((members) => {
      activeMembersCache = members;
      return members;
    })
    .finally(() => {
      activeMembersLoadPromise = null;
    });

  return activeMembersLoadPromise;
};

const loadMembershipCardData = async (member, { force = false } = {}) => {
  const cacheKey = getCardDataCacheKey(member);

  if (!force && cardDataCache.has(cacheKey)) {
    return cardDataCache.get(cacheKey);
  }

  if (!force && cardDataLoadPromises.has(cacheKey)) {
    return cardDataLoadPromises.get(cacheKey);
  }

  const loadPromise = Promise.all([
    supabase
      .from("payment_history")
      .select("*")
      .eq("member_id", member.id)
      .order("payment_for_month", { ascending: false }),
    getMemberFileSignedUrl(member.passportPhotoPath),
  ])
    .then(([paymentResponse, signedPhotoUrl]) => {
      if (paymentResponse.error) throw paymentResponse.error;

      const cardData = {
        payments: paymentResponse.data || [],
        photoUrl: signedPhotoUrl,
      };

      cardDataCache.set(cacheKey, cardData);
      return cardData;
    })
    .finally(() => {
      cardDataLoadPromises.delete(cacheKey);
    });

  cardDataLoadPromises.set(cacheKey, loadPromise);
  return loadPromise;
};

const formatCurrency = (value) => `Rs.${Number(value || 0).toFixed(2)}`;

const formatDate = (dateValue) => {
  if (!dateValue) return "Not added";

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const readSendCardResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
    return {
      error:
        "The email API route is not running. Use `vercel dev` locally, or deploy the app with SMTP environment variables configured.",
    };
  }

  return { error: text || "Could not send membership card." };
};

const SkeletonBlock = ({ className = "" }) => <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;

const MemberListSkeleton = () => (
  <div className="space-y-2 p-2">
    {Array.from({ length: 7 }).map((_, index) => (
      <div key={index} className="flex items-start gap-3 rounded-md px-3 py-2">
        <SkeletonBlock className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const PaymentRecordsSkeleton = () => (
  <div className="space-y-2 rounded-md border border-slate-200 p-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr] gap-3">
        <SkeletonBlock className="h-4" />
        <SkeletonBlock className="h-4" />
        <SkeletonBlock className="h-4" />
        <SkeletonBlock className="h-4" />
      </div>
    ))}
  </div>
);

const MembershipCardPreview = ({ member, payments, photoUrl, isLoading }) => {
  const [loadedImage, setLoadedImage] = useState({ src: "", loaded: false });
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const isCurrentImageLoaded = loadedImage.src === photoUrl && loadedImage.loaded;

  if (!member) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Select a member to preview and send their membership card.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Library Pro</div>
        <div className="mt-1 text-xl font-bold">Membership Card</div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        {isLoading ? (
          <SkeletonBlock className="h-32 w-28 border border-slate-200" />
        ) : photoUrl ? (
          <div className="relative h-32 w-28 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            {!isCurrentImageLoaded && <SkeletonBlock className="absolute inset-0" />}
            <img
              src={photoUrl}
              alt={member.fullName}
              onLoad={() => setLoadedImage({ src: photoUrl, loaded: true })}
              className={`h-full w-full object-cover transition-opacity duration-200 ${isCurrentImageLoaded ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        ) : (
          <div className="flex h-32 w-28 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-3xl font-bold text-slate-400">
            {member.fullName?.charAt(0)?.toUpperCase() || "M"}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-2xl font-bold text-slate-900">{member.fullName}</h3>
          <div className="mt-1 text-sm text-slate-500">Member ID: {member.id.slice(0, 8)}</div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Phone</div>
              <div className="text-sm font-medium text-slate-900">{member.phoneNumber}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Email</div>
              <div className="break-words text-sm font-medium text-slate-900">{member.registeredEmail || "Not added"}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Seat</div>
              <div className="text-sm font-medium text-slate-900">
                {member.seatNumber} ({member.seatFloor} floor)
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Locker</div>
              <div className="text-sm font-medium text-slate-900">{member.isLockerTaken ? "Taken" : "Not taken"}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Registered</div>
              <div className="text-sm font-medium text-slate-900">{formatDate(member.registrationDate)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Paid Until</div>
              <div className="text-sm font-medium text-slate-900">{formatDate(member.paidUntil)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="font-bold text-slate-900">Payment Records</h4>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Total {formatCurrency(totalPaid)}</span>
        </div>

        {isLoading ? (
          <PaymentRecordsSkeleton />
        ) : payments.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No payment records found.</div>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">For</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2 text-slate-700">{formatDate(payment.payment_for_month)}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.payment_type || "Monthly Fee"}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.payment_method}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const MembershipCards = () => {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [payments, setPayments] = useState([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCardData, setLoadingCardData] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState({ tone: "", message: "" });

  const selectedMember = useMemo(() => members.find((member) => member.id === selectedMemberId) || null, [members, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      [member.fullName, member.phoneNumber, member.registeredEmail, member.seatNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [members, searchQuery]);

  useEffect(() => {
    let ignore = false;

    const applyMembers = (loadedMembers) => {
      setMembers(loadedMembers);
      setSelectedMemberId((currentId) => (loadedMembers.some((member) => member.id === currentId) ? currentId : loadedMembers[0]?.id || ""));
    };

    const fetchMembers = async ({ force = false } = {}) => {
      if (!activeMembersCache || force) {
        setLoading(true);
      }

      if (force) {
        setNotice({ tone: "", message: "" });
      }

      try {
        const loadedMembers = await loadActiveMembers({ force });
        if (!ignore) {
          applyMembers(loadedMembers);
        }
      } catch (error) {
        if (!ignore) {
          setNotice({ tone: "error", message: error.message });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    if (activeMembersCache) {
      applyMembers(activeMembersCache);
      setLoading(false);
    }

    fetchMembers();

    const membersChannel = supabase
      .channel("membership_cards_members_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "library_members" }, (payload) => {
        const changedMemberId = payload.new?.id || payload.old?.id;
        if (changedMemberId) {
          clearCardDataForMember(changedMemberId);
        }
        fetchMembers({ force: true });
      })
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(membersChannel);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCardData = async () => {
      if (!selectedMember) {
        setPayments([]);
        setPhotoUrl("");
        setLoadingCardData(false);
        return;
      }

      const hasCachedCardData = cardDataCache.has(getCardDataCacheKey(selectedMember));
      setLoadingCardData(!hasCachedCardData);

      try {
        const cardData = await loadMembershipCardData(selectedMember);

        if (ignore) return;

        setPayments(cardData.payments);
        setPhotoUrl(cardData.photoUrl);
      } catch (error) {
        if (!ignore) {
          setNotice({ tone: "error", message: error.message });
          setPayments([]);
          setPhotoUrl("");
        }
      } finally {
        if (!ignore) {
          setLoadingCardData(false);
        }
      }
    };

    loadCardData();

    const paymentsChannel = selectedMember
      ? supabase
          .channel(`membership_cards_payments_changes_${selectedMember.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "payment_history", filter: `member_id=eq.${selectedMember.id}` },
            async () => {
              clearCardDataForMember(selectedMember.id);
              setLoadingCardData(true);

              try {
                const cardData = await loadMembershipCardData(selectedMember, { force: true });
                if (!ignore) {
                  setPayments(cardData.payments);
                  setPhotoUrl(cardData.photoUrl);
                }
              } catch (error) {
                if (!ignore) {
                  setNotice({ tone: "error", message: error.message });
                }
              } finally {
                if (!ignore) {
                  setLoadingCardData(false);
                }
              }
            },
          )
          .subscribe()
      : null;

    return () => {
      ignore = true;
      if (paymentsChannel) {
        supabase.removeChannel(paymentsChannel);
      }
    };
  }, [selectedMember]);

  const handleSendCard = useCallback(async () => {
    if (!selectedMember) return;

    setNotice({ tone: "", message: "" });

    if (!selectedMember.registeredEmail) {
      setNotice({ tone: "error", message: "Add a registered email for this member before sending the card." });
      return;
    }

    setSending(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session?.access_token) {
      setSending(false);
      setNotice({ tone: "error", message: "Your login session expired. Please log in again before sending a card." });
      return;
    }

    try {
      const response = await fetch("/api/send-membership-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          member: selectedMember,
          payments,
          photoUrl,
        }),
      });

      const result = await readSendCardResponse(response);
      setSending(false);

      if (!response.ok) {
        setNotice({ tone: "error", message: result.error || "Could not send membership card." });
        return;
      }

      setNotice({ tone: "success", message: `Membership card sent to ${selectedMember.registeredEmail}.` });
    } catch (error) {
      setSending(false);
      setNotice({
        tone: "error",
        message: `Could not reach the email API. ${error.message}. Use Vercel dev locally or check the deployed API route.`,
      });
    }
  }, [payments, photoUrl, selectedMember]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Membership Cards</h2>
          <p className="mt-1 text-sm text-slate-500">Send read-only membership cards to registered member emails.</p>
        </div>
        <button
          type="button"
          onClick={handleSendCard}
          disabled={!selectedMember || sending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          <Send size={16} />
          {sending ? "Sending..." : "Send Card"}
        </button>
      </div>

      {notice.message && (
        <div
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            notice.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-3">
            <SearchBar placeholder="Search members" value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="max-h-[640px] overflow-y-auto p-2">
            {loading && <MemberListSkeleton />}
            {!loading && filteredMembers.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-slate-500">
                <Search size={18} />
                No members found.
              </div>
            )}
            {!loading &&
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`mb-1 flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition ${
                    selectedMemberId === member.id ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    <UserRound size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{member.fullName}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Mail size={12} />
                      <span className="truncate">{member.registeredEmail || "No email added"}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <CreditCard size={12} />
                      Seat {member.seatNumber} - {member.isLockerTaken ? "Locker" : "No locker"}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </aside>

        <MembershipCardPreview member={selectedMember} payments={payments} photoUrl={photoUrl} isLoading={loadingCardData} />
      </div>
    </div>
  );
};

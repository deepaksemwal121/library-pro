import * as XLSX from "xlsx";

export const exportMembersToExcel = (members) => {
  if (!members || members.length === 0) {
    alert("No members to export");
    return;
  }

  // Prepare data for Excel
  const data = members.map((member) => ({
    "Full Name": member.fullName,
    "Phone Number": member.phoneNumber,
    "ID Type": member.idType,
    "ID Number": member.idNumber,
    "Registration Date": member.registrationDate,
    "Seat Number": member.seatNumber,
    Floor: member.seatFloor,
    "Membership Tier": member.isFreeTier ? "Free tier" : "Paid member",
    Locker: member.isLockerTaken ? "Yes" : "No",
    "Fee Amount": member.isFreeTier ? 0 : member.feeAmount,
    "Payment Method": member.isFreeTier ? "N/A" : member.paymentMethod,
    "Paid Until": member.isFreeTier ? "Free tier" : member.paidUntil,
    "Date of Birth": member.dateOfBirth || "-",
    "Transaction Notes": member.transactionNotes || "-",
  }));

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Members");

  // Set column widths
  const columnWidths = [
    { wch: 18 }, // Full Name
    { wch: 14 }, // Phone Number
    { wch: 10 }, // ID Type
    { wch: 14 }, // ID Number
    { wch: 16 }, // Registration Date
    { wch: 12 }, // Seat Number
    { wch: 10 }, // Floor
    { wch: 16 }, // Membership Tier
    { wch: 8 }, // Locker
    { wch: 12 }, // Fee Amount
    { wch: 14 }, // Payment Method
    { wch: 12 }, // Paid Until
    { wch: 12 }, // Date of Birth
    { wch: 20 }, // Transaction Notes
  ];
  worksheet["!cols"] = columnWidths;

  // Generate filename with current date
  const dateString = new Date().toISOString().split("T")[0];
  const filename = `LibraryPro_Members_${dateString}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
};

"use client";

interface BookingStatusSelectProps {
  bookingId: string;
  currentStatus: string;
  updateBookingStatus: (formData: FormData) => Promise<void>;
}

export function BookingStatusSelect({
  bookingId,
  currentStatus,
  updateBookingStatus,
}: BookingStatusSelectProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "APPROVED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PAID":
        return "bg-green-100 text-green-800 border-green-200";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <form action={updateBookingStatus} className="inline">
      <input type="hidden" name="bookingId" value={bookingId} />
      <select
        name="status"
        defaultValue={currentStatus}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`px-3 py-1 text-xs font-medium border rounded-full cursor-pointer ${getStatusColor(currentStatus)}`}
      >
        <option value="PENDING">PENDING</option>
        <option value="APPROVED">APPROVED</option>
        <option value="PAID">PAID</option>
        <option value="EXPIRED">EXPIRED</option>
        <option value="CANCELLED">CANCELLED</option>
      </select>
    </form>
  );
}

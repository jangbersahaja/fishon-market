import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

// Date formatting helper (using native Date methods to avoid date-fns dependency)
const formatDate = (date: Date, includeTime = false): string => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = date.getDate().toString().padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  if (!includeTime) {
    return `${day} ${month} ${year}`;
  }

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
};

// Types
interface ReceiptData {
  booking: {
    id: string;
    charterName: string;
    location: string;
    tripName: string;
    date: Date;
    days: number;
    adults: number;
    children: number;
    startTime: string | null;
    unitPrice: number;
    totalPrice: number;
    paidAt: Date | null;
    createdAt: Date;
  };
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  receiptNumber: string;
}

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2pt solid #0F6292",
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  brandName: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#0F6292",
  },
  tagline: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  receiptTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    textAlign: "right",
  },
  receiptMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  metaLeft: {
    flex: 1,
  },
  metaRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  label: {
    fontSize: 9,
    color: "#666",
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    color: "#333",
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0F6292",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1pt solid #E5E7EB",
  },
  table: {
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #E5E7EB",
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    flexDirection: "row",
    fontFamily: "Helvetica-Bold",
  },
  tableColDescription: {
    width: "50%",
    paddingLeft: 8,
  },
  tableColQty: {
    width: "15%",
    textAlign: "center",
  },
  tableColUnit: {
    width: "15%",
    textAlign: "right",
  },
  tableColAmount: {
    width: "20%",
    textAlign: "right",
    paddingRight: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingVertical: 4,
  },
  summaryLabel: {
    width: "30%",
    textAlign: "right",
    paddingRight: 10,
    color: "#666",
  },
  summaryValue: {
    width: "20%",
    textAlign: "right",
    paddingRight: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingVertical: 10,
    borderTop: "2pt solid #0F6292",
    backgroundColor: "#F0F9FF",
  },
  totalLabel: {
    width: "30%",
    textAlign: "right",
    paddingRight: 10,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0F6292",
  },
  totalValue: {
    width: "20%",
    textAlign: "right",
    paddingRight: 8,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0F6292",
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1pt solid #E5E7EB",
  },
  footerText: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  paidStamp: {
    position: "absolute",
    top: 150,
    right: 60,
    fontSize: 48,
    color: "#10B981",
    fontFamily: "Helvetica-Bold",
    transform: "rotate(-15deg)",
    opacity: 0.2,
  },
});

const ReceiptTemplate: React.FC<{ data: ReceiptData }> = ({ data }) => {
  const { booking, user, receiptNumber } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* PAID Watermark */}
        {booking.paidAt && <Text style={styles.paidStamp}>PAID</Text>}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.brandName}>Fishon.my</Text>
              <Text style={styles.tagline}>
                Malaysia&apos;s Premier Fishing Charter Marketplace
              </Text>
            </View>
            <View>
              <Text style={styles.receiptTitle}>RECEIPT</Text>
            </View>
          </View>

          <View style={styles.receiptMeta}>
            <View style={styles.metaLeft}>
              <Text style={styles.label}>Receipt Number</Text>
              <Text style={styles.value}>{receiptNumber}</Text>

              <Text style={styles.label}>Booking ID</Text>
              <Text style={styles.value}>{booking.id}</Text>

              <Text style={styles.label}>Booking Date</Text>
              <Text style={styles.value}>
                {formatDate(booking.createdAt, true)}
              </Text>
            </View>

            <View style={styles.metaRight}>
              <Text style={styles.label}>Payment Date</Text>
              <Text style={styles.value}>
                {booking.paidAt ? formatDate(booking.paidAt, true) : "—"}
              </Text>

              <Text style={styles.label}>Status</Text>
              <Text
                style={[
                  styles.value,
                  { color: booking.paidAt ? "#10B981" : "#F59E0B" },
                ]}
              >
                {booking.paidAt ? "PAID" : "PENDING"}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.receiptMeta}>
            <View style={styles.metaLeft}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{user.name || "—"}</Text>

              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{user.phone || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Charter Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Charter Details</Text>
          <View style={styles.receiptMeta}>
            <View style={styles.metaLeft}>
              <Text style={styles.label}>Charter</Text>
              <Text style={styles.value}>{booking.charterName}</Text>

              <Text style={styles.label}>Location</Text>
              <Text style={styles.value}>{booking.location}</Text>
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.label}>Trip</Text>
              <Text style={styles.value}>{booking.tripName}</Text>

              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>
                {formatDate(booking.date)}
                {booking.startTime && ` • ${booking.startTime}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Itemized Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itemized Breakdown</Text>

          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableColDescription}>Description</Text>
              <Text style={styles.tableColQty}>Qty</Text>
              <Text style={styles.tableColUnit}>Unit Price</Text>
              <Text style={styles.tableColAmount}>Amount</Text>
            </View>

            {/* Trip Row */}
            <View style={styles.tableRow}>
              <Text style={styles.tableColDescription}>
                {booking.tripName} ({booking.days}{" "}
                {booking.days > 1 ? "days" : "day"})
              </Text>
              <Text style={styles.tableColQty}>{booking.days}</Text>
              <Text style={styles.tableColUnit}>
                RM {booking.unitPrice.toFixed(2)}
              </Text>
              <Text style={styles.tableColAmount}>
                RM {(booking.unitPrice * booking.days).toFixed(2)}
              </Text>
            </View>

            {/* Guests Row */}
            <View style={styles.tableRow}>
              <Text style={styles.tableColDescription}>
                Guests ({booking.adults} adults
                {booking.children > 0 && `, ${booking.children} children`})
              </Text>
              <Text style={styles.tableColQty}>—</Text>
              <Text style={styles.tableColUnit}>—</Text>
              <Text style={styles.tableColAmount}>Included</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>
              RM {booking.totalPrice.toFixed(2)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>
              RM {booking.totalPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for booking with Fishon.my
          </Text>
          <Text style={styles.footerText}>
            For support, contact us at support@fishon.my
          </Text>
          <Text style={[styles.footerText, { marginTop: 10 }]}>
            This is a computer-generated receipt and does not require a
            signature.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptTemplate;

import { prisma } from "@/lib/database/prisma";

async function getNewsletterSubscribers() {
  return prisma.newsletterSubscription.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export default async function NewsletterPage() {
  const subscribers = await getNewsletterSubscribers();
  const activeCount = subscribers.filter((s) => s.active).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Newsletter Subscribers
        </h1>
        <p className="text-sm text-gray-600">
          {activeCount} active subscribers out of {subscribers.length} total
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <h2 className="mb-2 text-lg font-semibold text-blue-900">
          Integration Instructions
        </h2>
        <p className="text-sm text-blue-800">
          To send newsletters, integrate with a service like Mailchimp,
          SendGrid, or Zoho Campaigns. Export the subscriber list below and
          import it into your email marketing platform.
        </p>
      </div>

      <div className="mb-4 flex justify-end">
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(
            "Email,Name,Status,Subscribed\n" +
              subscribers
                .map(
                  (s) =>
                    `${s.email},${s.name || ""},${
                      s.active ? "Active" : "Unsubscribed"
                    },${new Date(s.createdAt).toISOString()}`
                )
                .join("\n")
          )}`}
          download="newsletter-subscribers.csv"
          className="rounded-md bg-[#EC2227] px-4 py-2 text-white hover:opacity-90"
        >
          Export Email List (CSV)
        </a>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Subscribed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {subscriber.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {subscriber.name || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        subscriber.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {subscriber.active ? "Active" : "Unsubscribed"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(subscriber.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {subscribers.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-600">No subscribers yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

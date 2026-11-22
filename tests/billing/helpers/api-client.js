export async function loadBillingApi() {
  const [bills, payments, students, cancellations, studentCharges, studentProfiles] = await Promise.all([
    import("../../../src/app/api/bills/route"),
    import("../../../src/app/api/payments/route"),
    import("../../../src/app/api/students/[id]/route"),
    import("../../../src/app/api/bills/[id]/cancel/route"),
    import("../../../src/app/api/student-charges/route"),
    import("../../../src/app/api/students/[id]/profile/route"),
  ]);
  return {
    createBill: bills.POST,
    recordPayment: payments.POST,
    cancelBill: async (id) => {
      const response = await cancellations.POST(
        new Request(`http://billing-qa.local/api/bills/${id}/cancel`, {
          method: "POST",
        }),
        { params: Promise.resolve({ id }) },
      );
      return {
        status: response.status,
        body: await response.json(),
      };
    },
    deleteStudent: async (id) => {
      const response = await students.DELETE(
        new Request(`http://billing-qa.local/api/students/${id}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id }) },
      );
      return {
        status: response.status,
        body: await response.json(),
      };
    },
    deleteStudentCharge: async (id) => {
      const response = await studentCharges.DELETE(
        new Request(`http://billing-qa.local/api/student-charges?id=${id}`, {
          method: "DELETE",
        }),
      );
      return {
        status: response.status,
        body: await response.json(),
      };
    },
    getStudentProfile: async (id, academicYearId) => {
      const response = await studentProfiles.GET(
        new Request(
          `http://billing-qa.local/api/students/${id}/profile?academicYearId=${encodeURIComponent(academicYearId)}`,
        ),
        { params: Promise.resolve({ id }) },
      );
      return {
        status: response.status,
        body: await response.json(),
      };
    },
  };
}

export async function postJson(handler, body, path, headers = {}) {
  const response = await handler(
    new Request(`http://billing-qa.local${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
  return {
    status: response.status,
    body: await response.json(),
  };
}

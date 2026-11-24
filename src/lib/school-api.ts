import { NextResponse } from "next/server";
import {
  getConfiguredSchool,
  SchoolConfigurationError,
  SCHOOL_SETUP_REQUIRED_MESSAGE,
} from "@/lib/school";

export async function requireConfiguredSchool() {
  const school = await getConfiguredSchool();
  if (!school) {
    throw new SchoolConfigurationError(SCHOOL_SETUP_REQUIRED_MESSAGE);
  }
  return school;
}

export function schoolConfigurationErrorResponse(error: unknown) {
  if (!(error instanceof SchoolConfigurationError)) {
    return null;
  }

  return NextResponse.json(
    { error: error.message },
    {
      status:
        error.message === SCHOOL_SETUP_REQUIRED_MESSAGE ? 404 : 500,
    },
  );
}

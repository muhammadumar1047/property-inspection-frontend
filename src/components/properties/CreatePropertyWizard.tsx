"use client";

import PropertyForm from "@/components/properties/PropertyForm";

/**
 * Thin wrapper around PropertyForm for standalone page use at /properties/create.
 */
export default function CreatePropertyWizard() {
  return <PropertyForm mode="standalone" />;
}

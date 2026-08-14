# Medication record

## Fields

Drug name، generic name (optional)، dose، dose unit، route (oral/topical/vaginal/IM/IV/other)، frequency، duration، start date، planned end date، indication، prescribed by، status (active/stopped/completed)، stop reason، notes.

## Behavior

- Drug name, dose, route and frequency are required when the record is a prescription.
- Dates and status preserve the medication history; stopping a drug creates an audit record and never deletes the old row.
- The system does not check dosage safety or provide prescribing advice; that remains the clinician’s responsibility.

## Why these fields

HL7 FHIR MedicationRequest models the medication request against a patient/encounter and can reference a reason/condition. The selected fields are the minimum operational information needed to understand what was prescribed, how it is taken, why, and what happened later.

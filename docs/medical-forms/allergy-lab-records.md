# Allergy and laboratory records

## Allergy

Substance، reaction، severity (mild/moderate/severe/unknown)، status (active/inactive/entered-in-error)، recorded date، recorder، notes. The profile shows an alert label and icon; details remain permission-controlled.

This maps to the practical parts of an AllergyIntolerance record: the substance, clinical reaction, verification/status and notes.

## Laboratory

Test name، optional code، requested date، collected date، result date، result numeric or text، unit، reference range، abnormal flag (normal/high/low/critical/not interpreted)، status (ordered/collected/resulted/cancelled)، requester، linked visit/case، attachment metadata.

Numeric values and units are structured for trends; a narrative interpretation remains available for the reporting laboratory. This follows the FHIR distinction between observations/results and a diagnostic report while keeping the first release practical for a clinic.

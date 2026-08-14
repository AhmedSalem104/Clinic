/* Clinic Management System - SQL Server schema
   Run through scripts/migrate.js. The statements are idempotent. */

IF OBJECT_ID(N'dbo.Doctors', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Doctors (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Doctors PRIMARY KEY,
    FullName NVARCHAR(160) NOT NULL,
    Specialty NVARCHAR(160) NULL,
    Phone NVARCHAR(40) NULL,
    Email NVARCHAR(255) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Doctors_Status DEFAULT N'active',
    Bio NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Doctors_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Doctors_UpdatedAt DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.Services', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Services (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Services PRIMARY KEY,
    Name NVARCHAR(160) NOT NULL,
    Category NVARCHAR(100) NULL,
    BaseDurationMinutes INT NOT NULL CONSTRAINT CK_Services_Duration CHECK (BaseDurationMinutes BETWEEN 1 AND 480),
    RequiresQueue BIT NOT NULL CONSTRAINT DF_Services_RequiresQueue DEFAULT 1,
    RequiresBooking BIT NOT NULL CONSTRAINT DF_Services_RequiresBooking DEFAULT 1,
    IsActive BIT NOT NULL CONSTRAINT DF_Services_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Services_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Services_UpdatedAt DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.Patients', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Patients (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Patients PRIMARY KEY,
    PatientCode NVARCHAR(30) NOT NULL,
    FullName NVARCHAR(180) NOT NULL,
    NormalizedName NVARCHAR(180) NOT NULL,
    DateOfBirth DATE NULL,
    Phone NVARCHAR(40) NOT NULL,
    NormalizedPhone NVARCHAR(40) NOT NULL,
    AlternatePhone NVARCHAR(40) NULL,
    PreferredContactChannel NVARCHAR(20) NULL,
    Address NVARCHAR(500) NULL,
    EmergencyContactName NVARCHAR(160) NULL,
    EmergencyContactPhone NVARCHAR(40) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Patients_Status DEFAULT N'active',
    HighRiskFlag BIT NOT NULL CONSTRAINT DF_Patients_HighRisk DEFAULT 0,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Patients_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Patients_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Patients_PatientCode UNIQUE (PatientCode)
  );
END;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    FullName NVARCHAR(160) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(30) NOT NULL CONSTRAINT CK_Users_Role CHECK (Role IN (N'owner', N'doctor', N'reception', N'patient')),
    DoctorId INT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    LastLoginAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT FK_Users_Doctors FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.DoctorServices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.DoctorServices (
    DoctorId INT NOT NULL,
    ServiceId INT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_DoctorServices_IsActive DEFAULT 1,
    CONSTRAINT PK_DoctorServices PRIMARY KEY (DoctorId, ServiceId),
    CONSTRAINT FK_DoctorServices_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_DoctorServices_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Pricing', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pricing (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Pricing PRIMARY KEY,
    DoctorId INT NOT NULL,
    ServiceId INT NOT NULL,
    Price DECIMAL(12,2) NOT NULL CONSTRAINT CK_Pricing_Price CHECK (Price >= 0),
    DiscountPercent DECIMAL(5,2) NULL CONSTRAINT CK_Pricing_Discount CHECK (DiscountPercent IS NULL OR (DiscountPercent >= 0 AND DiscountPercent <= 100)),
    EffectiveFrom DATE NOT NULL,
    EffectiveTo DATE NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Pricing_IsActive DEFAULT 1,
    Notes NVARCHAR(500) NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Pricing_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Pricing_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_Pricing_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(Id),
    CONSTRAINT FK_Pricing_User FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.DoctorSchedules', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.DoctorSchedules (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorSchedules PRIMARY KEY,
    DoctorId INT NOT NULL,
    DayOfWeek TINYINT NOT NULL CONSTRAINT CK_DoctorSchedules_Day CHECK (DayOfWeek BETWEEN 0 AND 6),
    StartTime TIME(0) NOT NULL,
    EndTime TIME(0) NOT NULL,
    BreaksJson NVARCHAR(MAX) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_DoctorSchedules_IsActive DEFAULT 1,
    CONSTRAINT CK_DoctorSchedules_Time CHECK (StartTime < EndTime),
    CONSTRAINT FK_DoctorSchedules_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.ScheduleExceptions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ScheduleExceptions (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ScheduleExceptions PRIMARY KEY,
    DoctorId INT NOT NULL,
    ExceptionDate DATE NOT NULL,
    StartTime TIME(0) NULL,
    EndTime TIME(0) NULL,
    ExceptionType NVARCHAR(30) NOT NULL CONSTRAINT CK_ScheduleExceptions_Type CHECK (ExceptionType IN (N'vacation', N'special', N'unavailable')),
    Reason NVARCHAR(500) NULL,
    CONSTRAINT FK_ScheduleExceptions_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.PatientAssignments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PatientAssignments (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PatientAssignments PRIMARY KEY,
    PatientId INT NOT NULL,
    DoctorId INT NOT NULL,
    AssignmentType NVARCHAR(30) NOT NULL CONSTRAINT CK_PatientAssignments_Type CHECK (AssignmentType IN (N'primary', N'case')),
    CaseId INT NULL,
    AssignedBy INT NULL,
    AssignedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PatientAssignments_AssignedAt DEFAULT SYSUTCDATETIME(),
    EndedAt DATETIME2(0) NULL,
    CONSTRAINT FK_PatientAssignments_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_PatientAssignments_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_PatientAssignments_User FOREIGN KEY (AssignedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.MedicalCases', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.MedicalCases (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MedicalCases PRIMARY KEY,
    PatientId INT NOT NULL,
    Type NVARCHAR(80) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_MedicalCases_Status DEFAULT N'active',
    StartDate DATE NOT NULL CONSTRAINT DF_MedicalCases_StartDate DEFAULT CONVERT(date, SYSUTCDATETIME()),
    EndDate DATE NULL,
    AssignedDoctorId INT NULL,
    Summary NVARCHAR(1000) NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicalCases_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicalCases_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_MedicalCases_Status CHECK (Status IN (N'active', N'resolved', N'closed', N'on_hold')),
    CONSTRAINT FK_MedicalCases_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_MedicalCases_Doctor FOREIGN KEY (AssignedDoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_MedicalCases_User FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.PatientGyneHistories', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PatientGyneHistories (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PatientGyneHistories PRIMARY KEY,
    PatientId INT NOT NULL,
    MenarcheAge TINYINT NULL,
    CycleIntervalDays TINYINT NULL,
    MensesDurationDays TINYINT NULL,
    CycleRegularity NVARCHAR(30) NULL,
    LastMenstrualPeriod DATE NULL,
    MenstrualFlow NVARCHAR(30) NULL,
    Clots BIT NULL,
    Dysmenorrhea NVARCHAR(30) NULL,
    ContraceptionMethod NVARCHAR(120) NULL,
    StiHistory NVARCHAR(1000) NULL,
    CervicalScreeningJson NVARCHAR(MAX) NULL,
    Notes NVARCHAR(2000) NULL,
    RecordedBy INT NULL,
    RecordedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PatientGyneHistories_RecordedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_PatientGyneHistories_Patient UNIQUE (PatientId),
    CONSTRAINT FK_PatientGyneHistories_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_PatientGyneHistories_User FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.ObstetricHistory', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ObstetricHistory (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ObstetricHistory PRIMARY KEY,
    PatientId INT NOT NULL,
    PregnancyYear SMALLINT NULL,
    Outcome NVARCHAR(40) NOT NULL,
    GestationalAgeWeeks TINYINT NULL,
    DeliveryMode NVARCHAR(40) NULL,
    BirthWeightGrams INT NULL,
    MajorComplication NVARCHAR(500) NULL,
    Notes NVARCHAR(1000) NULL,
    RecordedBy INT NULL,
    RecordedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ObstetricHistory_RecordedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ObstetricHistory_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_ObstetricHistory_User FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Pregnancies', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pregnancies (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Pregnancies PRIMARY KEY,
    PatientId INT NOT NULL,
    CaseId INT NULL,
    PregnancyNumber INT NULL,
    LMP DATE NULL,
    EDD DATE NULL,
    EDDMethod NVARCHAR(40) NULL,
    Gravida TINYINT NULL,
    Para TINYINT NULL,
    Abortions TINYINT NULL,
    LivingChildren TINYINT NULL,
    FetalCount TINYINT NULL,
    RiskFactorsJson NVARCHAR(MAX) NULL,
    AssignedDoctorId INT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Pregnancies_Status DEFAULT N'active',
    BirthDate DATE NULL,
    DeliveryType NVARCHAR(50) NULL,
    BirthOutcome NVARCHAR(80) NULL,
    BirthComplications NVARCHAR(1000) NULL,
    Hospital NVARCHAR(180) NULL,
    PostpartumPlan NVARCHAR(2000) NULL,
    ClosedAt DATETIME2(0) NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Pregnancies_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Pregnancies_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Pregnancies_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Pregnancies_Case FOREIGN KEY (CaseId) REFERENCES dbo.MedicalCases(Id),
    CONSTRAINT FK_Pregnancies_Doctor FOREIGN KEY (AssignedDoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_Pregnancies_User FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Appointments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Appointments (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Appointments PRIMARY KEY,
    PatientId INT NOT NULL,
    DoctorId INT NOT NULL,
    ServiceId INT NOT NULL,
    BookingSource NVARCHAR(30) NOT NULL CONSTRAINT DF_Appointments_Source DEFAULT N'reception',
    StartAt DATETIME2(0) NOT NULL,
    EndAt DATETIME2(0) NULL,
    ExpectedDurationMinutes INT NOT NULL,
    Price DECIMAL(12,2) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Appointments_Status DEFAULT N'booked',
    ActiveSlotFlag AS (CONVERT(bit, CASE WHEN Status IN (N'booked', N'confirmed', N'arrived', N'waiting', N'in_consultation', N'late') THEN 1 ELSE 0 END)) PERSISTED,
    PublicTrackingToken NVARCHAR(64) NULL,
    CancellationReason NVARCHAR(500) NULL,
    Notes NVARCHAR(1000) NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Appointments_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Appointments_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Appointments_Status CHECK (Status IN (N'booked', N'confirmed', N'arrived', N'waiting', N'in_consultation', N'completed', N'late', N'no_show', N'cancelled', N'skipped')),
    CONSTRAINT FK_Appointments_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Appointments_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_Appointments_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(Id),
    CONSTRAINT FK_Appointments_User FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.QueueEntries', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.QueueEntries (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_QueueEntries PRIMARY KEY,
    AppointmentId INT NOT NULL,
    PatientId INT NOT NULL,
    DoctorId INT NOT NULL,
    ServiceId INT NOT NULL,
    QueueNumber INT NOT NULL,
    Position INT NOT NULL,
    QueueDate DATE NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_QueueEntries_Status DEFAULT N'waiting',
    CheckedInAt DATETIME2(0) NULL,
    ConsultationStartedAt DATETIME2(0) NULL,
    ConsultationEndedAt DATETIME2(0) NULL,
    ActualDurationMinutes INT NULL,
    ExpectedDurationMinutes INT NULL,
    ExpectedStartAt DATETIME2(0) NULL,
    ExpectedEndAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_QueueEntries_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_QueueEntries_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_QueueEntries_Appointment UNIQUE (AppointmentId),
    CONSTRAINT CK_QueueEntries_Status CHECK (Status IN (N'booked', N'confirmed', N'arrived', N'waiting', N'in_consultation', N'completed', N'late', N'no_show', N'cancelled', N'skipped')),
    CONSTRAINT FK_QueueEntries_Appointment FOREIGN KEY (AppointmentId) REFERENCES dbo.Appointments(Id),
    CONSTRAINT FK_QueueEntries_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_QueueEntries_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_QueueEntries_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.QueueEntries', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.QueueEntries', N'ExpectedDurationMinutes') IS NULL
BEGIN
  ALTER TABLE dbo.QueueEntries ADD ExpectedDurationMinutes INT NULL;
END;
GO

IF OBJECT_ID(N'dbo.QueueEntries', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.QueueEntries', N'QueueDate') IS NULL
BEGIN
  ALTER TABLE dbo.QueueEntries ADD QueueDate DATE NULL;
END;
GO

IF OBJECT_ID(N'dbo.QueueEntries', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.QueueEntries', N'QueueDate') IS NOT NULL
BEGIN
  UPDATE q SET QueueDate=CONVERT(date,a.StartAt) FROM dbo.QueueEntries q JOIN dbo.Appointments a ON a.Id=q.AppointmentId WHERE q.QueueDate IS NULL;
END;
GO

IF OBJECT_ID(N'dbo.Appointments', N'U') IS NOT NULL AND COL_LENGTH(N'dbo.Appointments', N'PublicTrackingToken') IS NULL
BEGIN
  ALTER TABLE dbo.Appointments ADD PublicTrackingToken NVARCHAR(64) NULL;
END;
GO

IF OBJECT_ID(N'dbo.DoctorPauses', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.DoctorPauses (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPauses PRIMARY KEY,
    DoctorId INT NOT NULL,
    StartedAt DATETIME2(0) NOT NULL,
    ResumedAt DATETIME2(0) NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_DoctorPauses_Status DEFAULT N'paused',
    Reason NVARCHAR(500) NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DoctorPauses_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_DoctorPauses_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id),
    CONSTRAINT FK_DoctorPauses_User FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Visits', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Visits (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Visits PRIMARY KEY,
    PatientId INT NOT NULL,
    AppointmentId INT NULL,
    CaseId INT NULL,
    DoctorId INT NOT NULL,
    VisitType NVARCHAR(40) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Visits_Status DEFAULT N'draft',
    ChiefComplaint NVARCHAR(2000) NULL,
    Symptoms NVARCHAR(3000) NULL,
    Examination NVARCHAR(3000) NULL,
    Assessment NVARCHAR(3000) NULL,
    Diagnosis NVARCHAR(3000) NULL,
    TreatmentPlan NVARCHAR(3000) NULL,
    DoctorNotes NVARCHAR(MAX) NULL,
    FollowUpPlan NVARCHAR(2000) NULL,
    NextVisitDate DATE NULL,
    WeightKg DECIMAL(5,2) NULL,
    HeightCm DECIMAL(5,2) NULL,
    SystolicBp SMALLINT NULL,
    DiastolicBp SMALLINT NULL,
    PulseBpm SMALLINT NULL,
    TemperatureC DECIMAL(4,1) NULL,
    OxygenSaturation DECIMAL(5,2) NULL,
    PainScore TINYINT NULL,
    StartedAt DATETIME2(0) NULL,
    CompletedAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Visits_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Visits_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Visits_Status CHECK (Status IN (N'draft', N'completed', N'voided')),
    CONSTRAINT FK_Visits_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Visits_Appointment FOREIGN KEY (AppointmentId) REFERENCES dbo.Appointments(Id),
    CONSTRAINT FK_Visits_Case FOREIGN KEY (CaseId) REFERENCES dbo.MedicalCases(Id),
    CONSTRAINT FK_Visits_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.PregnancyVisits', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PregnancyVisits (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PregnancyVisits PRIMARY KEY,
    PregnancyId INT NOT NULL,
    VisitId INT NOT NULL,
    GestationalAgeWeeks TINYINT NULL,
    GestationalAgeDays TINYINT NULL,
    FundalHeightCm DECIMAL(5,2) NULL,
    FetalHeartRateBpm SMALLINT NULL,
    FetalMovementConcern NVARCHAR(30) NULL,
    UrineProtein NVARCHAR(20) NULL,
    Edema NVARCHAR(30) NULL,
    Presentation NVARCHAR(40) NULL,
    RiskAssessmentOutcome NVARCHAR(40) NULL,
    SymptomsJson NVARCHAR(MAX) NULL,
    FetalDataJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PregnancyVisits_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_PregnancyVisits_Visit UNIQUE (VisitId),
    CONSTRAINT FK_PregnancyVisits_Pregnancy FOREIGN KEY (PregnancyId) REFERENCES dbo.Pregnancies(Id),
    CONSTRAINT FK_PregnancyVisits_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Medications', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Medications (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Medications PRIMARY KEY,
    PatientId INT NOT NULL,
    CaseId INT NULL,
    VisitId INT NULL,
    DrugName NVARCHAR(180) NOT NULL,
    GenericName NVARCHAR(180) NULL,
    Dose NVARCHAR(80) NOT NULL,
    DoseUnit NVARCHAR(50) NULL,
    Route NVARCHAR(40) NULL,
    Frequency NVARCHAR(80) NOT NULL,
    Duration NVARCHAR(80) NULL,
    StartDate DATE NOT NULL,
    PlannedEndDate DATE NULL,
    Indication NVARCHAR(500) NULL,
    PrescribedBy INT NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Medications_Status DEFAULT N'active',
    StopReason NVARCHAR(500) NULL,
    Notes NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Medications_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Medications_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Medications_Status CHECK (Status IN (N'active', N'stopped', N'completed')),
    CONSTRAINT FK_Medications_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Medications_Case FOREIGN KEY (CaseId) REFERENCES dbo.MedicalCases(Id),
    CONSTRAINT FK_Medications_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(Id),
    CONSTRAINT FK_Medications_Doctor FOREIGN KEY (PrescribedBy) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Allergies', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Allergies (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Allergies PRIMARY KEY,
    PatientId INT NOT NULL,
    Substance NVARCHAR(180) NOT NULL,
    Reaction NVARCHAR(500) NULL,
    Severity NVARCHAR(30) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Allergies_Status DEFAULT N'active',
    Notes NVARCHAR(1000) NULL,
    RecordedBy INT NULL,
    RecordedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Allergies_RecordedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Allergies_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Allergies_User FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.LabTests', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.LabTests (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LabTests PRIMARY KEY,
    PatientId INT NOT NULL,
    CaseId INT NULL,
    VisitId INT NULL,
    TestName NVARCHAR(180) NOT NULL,
    Code NVARCHAR(50) NULL,
    RequestedDate DATE NULL,
    CollectedDate DATE NULL,
    ResultDate DATE NULL,
    ResultNumeric DECIMAL(18,6) NULL,
    ResultText NVARCHAR(2000) NULL,
    Unit NVARCHAR(50) NULL,
    ReferenceRange NVARCHAR(120) NULL,
    AbnormalFlag NVARCHAR(30) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_LabTests_Status DEFAULT N'ordered',
    RequestedBy INT NULL,
    AttachmentDocumentId INT NULL,
    Notes NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_LabTests_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_LabTests_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_LabTests_Status CHECK (Status IN (N'ordered', N'collected', N'resulted', N'cancelled')),
    CONSTRAINT FK_LabTests_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_LabTests_Case FOREIGN KEY (CaseId) REFERENCES dbo.MedicalCases(Id),
    CONSTRAINT FK_LabTests_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(Id),
    CONSTRAINT FK_LabTests_Doctor FOREIGN KEY (RequestedBy) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Ultrasounds', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Ultrasounds (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Ultrasounds PRIMARY KEY,
    PatientId INT NOT NULL,
    CaseId INT NULL,
    VisitId INT NULL,
    PerformedBy INT NOT NULL,
    StudyDate DATE NOT NULL,
    StudyType NVARCHAR(50) NOT NULL,
    Indication NVARCHAR(500) NULL,
    Technique NVARCHAR(40) NULL,
    GestationalAgeWeeks TINYINT NULL,
    GestationalAgeDays TINYINT NULL,
    FetalCount TINYINT NULL,
    FetalHeartRateBpm SMALLINT NULL,
    CrlMm DECIMAL(6,2) NULL,
    BpdMm DECIMAL(6,2) NULL,
    HcMm DECIMAL(6,2) NULL,
    AcMm DECIMAL(6,2) NULL,
    FlMm DECIMAL(6,2) NULL,
    EstimatedFetalWeightGrams INT NULL,
    Placenta NVARCHAR(180) NULL,
    AmnioticFluid NVARCHAR(180) NULL,
    CervixLengthMm DECIMAL(6,2) NULL,
    UterusDimensions NVARCHAR(120) NULL,
    EndometriumThicknessMm DECIMAL(6,2) NULL,
    RightOvaryDimensions NVARCHAR(120) NULL,
    LeftOvaryDimensions NVARCHAR(120) NULL,
    AdnexaFindings NVARCHAR(2000) NULL,
    Findings NVARCHAR(4000) NULL,
    Impression NVARCHAR(3000) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Ultrasounds_Status DEFAULT N'final',
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Ultrasounds_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Ultrasounds_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Ultrasounds_Type CHECK (StudyType IN (N'obstetric_standard', N'obstetric_detailed', N'gynecological_pelvic', N'follow_up', N'other')),
    CONSTRAINT FK_Ultrasounds_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Ultrasounds_Case FOREIGN KEY (CaseId) REFERENCES dbo.MedicalCases(Id),
    CONSTRAINT FK_Ultrasounds_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(Id),
    CONSTRAINT FK_Ultrasounds_Doctor FOREIGN KEY (PerformedBy) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Documents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Documents (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Documents PRIMARY KEY,
    PatientId INT NOT NULL,
    CaseId INT NULL,
    VisitId INT NULL,
    DocumentType NVARCHAR(60) NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    MimeType NVARCHAR(120) NOT NULL,
    FileSizeBytes BIGINT NOT NULL,
    StoragePath NVARCHAR(1000) NOT NULL,
    DocumentDate DATE NULL,
    UploadedBy INT NOT NULL,
    IsArchived BIT NOT NULL CONSTRAINT DF_Documents_IsArchived DEFAULT 0,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Documents_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Documents_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Documents_Case FOREIGN KEY (CaseId) REFERENCES dbo.MedicalCases(Id),
    CONSTRAINT FK_Documents_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(Id),
    CONSTRAINT FK_Documents_User FOREIGN KEY (UploadedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.ProgressIndicators', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ProgressIndicators (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProgressIndicators PRIMARY KEY,
    PatientId INT NOT NULL,
    CaseId INT NULL,
    VisitId INT NULL,
    IndicatorName NVARCHAR(80) NOT NULL,
    ValueNumeric DECIMAL(18,6) NULL,
    ValueText NVARCHAR(300) NULL,
    Unit NVARCHAR(40) NULL,
    RecordedAt DATETIME2(0) NOT NULL,
    TrendStatus NVARCHAR(30) NULL,
    DoctorValidated BIT NOT NULL CONSTRAINT DF_ProgressIndicators_Validated DEFAULT 0,
    CreatedBy INT NULL,
    CONSTRAINT FK_ProgressIndicators_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_ProgressIndicators_Case FOREIGN KEY (CaseId) REFERENCES dbo.MedicalCases(Id),
    CONSTRAINT FK_ProgressIndicators_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(Id),
    CONSTRAINT FK_ProgressIndicators_Doctor FOREIGN KEY (CreatedBy) REFERENCES dbo.Doctors(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Notifications (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
    PatientId INT NULL,
    UserId INT NULL,
    AppointmentId INT NULL,
    Channel NVARCHAR(30) NOT NULL,
    EventType NVARCHAR(60) NOT NULL,
    Recipient NVARCHAR(255) NOT NULL,
    Message NVARCHAR(2000) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Notifications_Status DEFAULT N'queued',
    SentAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Notifications_Status CHECK (Status IN (N'queued', N'sent', N'failed', N'skipped')),
    CONSTRAINT FK_Notifications_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(Id),
    CONSTRAINT FK_Notifications_User FOREIGN KEY (UserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_Notifications_Appointment FOREIGN KEY (AppointmentId) REFERENCES dbo.Appointments(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.Settings', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Settings (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Settings PRIMARY KEY,
    SettingKey NVARCHAR(120) NOT NULL,
    SettingValue NVARCHAR(MAX) NULL,
    IsSensitive BIT NOT NULL CONSTRAINT DF_Settings_IsSensitive DEFAULT 0,
    UpdatedBy INT NULL,
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Settings_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Settings_Key UNIQUE (SettingKey),
    CONSTRAINT FK_Settings_User FOREIGN KEY (UpdatedBy) REFERENCES dbo.Users(Id)
  );
END;
GO

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AuditLogs (
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
    UserId INT NULL,
    Action NVARCHAR(100) NOT NULL,
    Entity NVARCHAR(100) NOT NULL,
    EntityId NVARCHAR(100) NULL,
    IpAddress NVARCHAR(64) NULL,
    OldValue NVARCHAR(MAX) NULL,
    NewValue NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_AuditLogs_User FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
  );
END;
GO

/* Search and queue indexes */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Patients_NormalizedPhone' AND object_id = OBJECT_ID(N'dbo.Patients'))
  CREATE INDEX IX_Patients_NormalizedPhone ON dbo.Patients (NormalizedPhone);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Patients_NormalizedName' AND object_id = OBJECT_ID(N'dbo.Patients'))
  CREATE INDEX IX_Patients_NormalizedName ON dbo.Patients (NormalizedName, Id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Appointments_DoctorDateStatus' AND object_id = OBJECT_ID(N'dbo.Appointments'))
  CREATE INDEX IX_Appointments_DoctorDateStatus ON dbo.Appointments (DoctorId, StartAt, Status) INCLUDE (PatientId, ServiceId, ExpectedDurationMinutes);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Appointments_PatientDate' AND object_id = OBJECT_ID(N'dbo.Appointments'))
  CREATE INDEX IX_Appointments_PatientDate ON dbo.Appointments (PatientId, StartAt DESC, Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Appointments_PublicTrackingToken' AND object_id = OBJECT_ID(N'dbo.Appointments'))
  CREATE UNIQUE INDEX UX_Appointments_PublicTrackingToken ON dbo.Appointments (PublicTrackingToken) WHERE PublicTrackingToken IS NOT NULL;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Appointments_DoctorActiveSlot' AND object_id = OBJECT_ID(N'dbo.Appointments'))
  DROP INDEX UX_Appointments_DoctorActiveSlot ON dbo.Appointments;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Queue_DoctorStatusPosition' AND object_id = OBJECT_ID(N'dbo.QueueEntries'))
  CREATE INDEX IX_Queue_DoctorStatusPosition ON dbo.QueueEntries (DoctorId, Status, Position) INCLUDE (PatientId, AppointmentId, ExpectedStartAt, ExpectedEndAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Queue_DoctorDatePosition' AND object_id = OBJECT_ID(N'dbo.QueueEntries'))
  CREATE INDEX IX_Queue_DoctorDatePosition ON dbo.QueueEntries (DoctorId, QueueDate, Position, Status) INCLUDE (PatientId, AppointmentId, ExpectedStartAt, ExpectedEndAt, ExpectedDurationMinutes);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Visits_PatientDate' AND object_id = OBJECT_ID(N'dbo.Visits'))
  CREATE INDEX IX_Visits_PatientDate ON dbo.Visits (PatientId, CreatedAt DESC, Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Medications_PatientStatus' AND object_id = OBJECT_ID(N'dbo.Medications'))
  CREATE INDEX IX_Medications_PatientStatus ON dbo.Medications (PatientId, Status, StartDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Labs_PatientDate' AND object_id = OBJECT_ID(N'dbo.LabTests'))
  CREATE INDEX IX_Labs_PatientDate ON dbo.LabTests (PatientId, ResultDate DESC, Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Ultrasounds_PatientDate' AND object_id = OBJECT_ID(N'dbo.Ultrasounds'))
  CREATE INDEX IX_Ultrasounds_PatientDate ON dbo.Ultrasounds (PatientId, StudyDate DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_EntityDate' AND object_id = OBJECT_ID(N'dbo.AuditLogs'))
  CREATE INDEX IX_AuditLogs_EntityDate ON dbo.AuditLogs (Entity, EntityId, CreatedAt DESC);

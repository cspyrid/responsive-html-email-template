# Architecture & Data Model Proposal

## Entity Relationship Overview
- **Users**: Base authentication entity with roles (`admin`, `teacher`).
- **Teachers**: Profile information and availability rules tied to a user account.
- **Classes (Τμήματα)**: Academic class groups with grade level and homeroom metadata.
- **Subjects**: Courses offered within classes and taught by teachers; relationships support multiple teachers per subject.
- **Classrooms**: Physical rooms with capacity and resource tags (laboratory, amphitheater, etc.).
- **Terms (Τετράμηνα)**: Academic terms/semesters that bound scheduling windows and publication state.
- **Exams**: Scheduled assessments linking subject, class, teacher, classroom, and term with timing, status, and notes.
- **ExamConstraints**: Configurable scheduling limits, such as maximum daily exams per class or buffer minutes between exams.
- **ExamConflicts**: Logged conflicts detected during scheduling for auditing.
- **Notifications**: Tracks alerts sent to admins and teachers regarding schedule changes.

## Proposed Eloquent Models & Key Fields
### User
- `id`, `name`, `email`, `password`, `role`
- Relationships: `hasOne Teacher`

### Teacher
- `id`, `user_id`, `department`, `phone`, `office`
- Relationships: `belongsTo User`, `belongsToMany Subject`, `belongsToMany Class`, `hasMany Exam`

### ClassModel
- `id`, `name`, `grade`, `section`, `max_daily_exams`, `max_weekly_exams`
- Relationships: `belongsToMany Subject`, `belongsToMany Teacher`, `hasMany Exam`

### Subject
- `id`, `name`, `code`, `color`
- Relationships: `belongsToMany ClassModel`, `belongsToMany Teacher`, `hasMany Exam`

### Classroom
- `id`, `name`, `capacity`, `equipment`, `is_lab`
- Relationships: `hasMany Exam`

### Term
- `id`, `name`, `start_date`, `end_date`, `is_active`, `status`
- Relationships: `hasMany Exam`

### Exam
- `id`, `subject_id`, `class_id`, `teacher_id`, `classroom_id`, `term_id`, `date`, `start_time`, `end_time`, `status`, `notes`
- Relationships: `belongsTo Subject`, `belongsTo ClassModel`, `belongsTo Teacher`, `belongsTo Classroom`, `belongsTo Term`

### ExamConstraint
- `id`, `name`, `type`, `value`, `scope_type`, `scope_id`
- Relationships: `morphTo scope`

### ExamConflict
- `id`, `exam_id`, `type`, `details`
- Relationships: `belongsTo Exam`

### Notification
- `id`, `user_id`, `type`, `data`, `read_at`
- Relationships: `belongsTo User`

## Database Schema Highlights (Laravel Migrations)
- Enforce foreign keys between exams and related entities.
- Use soft deletes for Exams to allow recovery.
- Add composite unique constraints to prevent overlapping exams:
  - `unique(term_id, class_id, date, start_time)` for class conflicts.
  - Additional logic at application level for teacher/classroom overlaps.

## Services & Business Logic
- **SchedulingService**: Validates new exam requests, checks constraints, and proposes alternative slots.
- **ConflictDetector**: Dedicated component to detect teacher, classroom, and class overlaps plus weekly/daily caps.
- **AvailabilityService**: Evaluates teacher/classroom availability windows.
- **TermService**: Manages activation, locking, and publishing of term schedules.

## Seeders & Factories
- Seed baseline users (admin + sample teachers), classes, subjects, classrooms, term, and sample exams.
- Factories for Exams to simulate realistic schedules during testing.

## Policies & Authorization
- Laravel Policies for Exams (Teacher can CRUD own exams while term is unlocked; Admin can manage all).
- Gates for administrative modules (terms, constraints, reports).

## Localization Strategy
- `resources/lang/el` as default with Greek translations matching UI labels from source material.
- `resources/lang/en` for English equivalents.
- Helper `@lang` directives in Blade templates and `trans_choice` where needed.

## Reporting & Export Layer
- Use jobs to generate PDF/CSV exports for heavy reports.
- DomPDF integration for printable weekly calendars by class/teacher.
- CSV exports built via Laravel collections.

## Testing Approach
- Feature tests for scheduling workflow, conflict detection, and term locking.
- Policy tests ensuring teachers cannot modify locked terms or others' exams.
- API tests for AJAX endpoints that validate slots and provide suggestions.

## Deployment Considerations
- Use queues for notifications/export generation.
- Cache localized strings and frequently used lookups (classes, subjects) via Redis.
- Configure CI to run PHPStan, Pint, and PHPUnit.

/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions */
import { Link, useNavigate } from 'react-router-dom';
import type { CourseWithSemester } from '@/entities/course/api/courseApi';
import { CourseActionsMenu } from './CourseActionsMenu';

export interface CourseCardProps {
  course: CourseWithSemester;
  onEdit: (course: CourseWithSemester) => void;
  onArchiveRestore: (course: CourseWithSemester) => void;
}

export function CourseCard({ course, onEdit, onArchiveRestore }: CourseCardProps) {
  const navigate = useNavigate();
  return (
    <article
      onClick={() => navigate(`/courses/${course.id}`)}
      className="relative flex h-full flex-col rounded-xl border border-secondary-200 bg-white p-4 shadow-sm transition-[box-shadow,border-color] hover:shadow-md hover:border-secondary-300 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: course.color }}
            />
            <span className="font-mono text-sm text-secondary-700">{course.code}</span>
            {!course.isActive && (
              <span className="inline-flex items-center rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-600">
                Archived
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold text-secondary-900">
            <Link
              to={`/courses/${course.id}`}
              className="focus:outline-none after:absolute after:inset-0"
              onClick={(e) => e.stopPropagation()}
            >
              {course.name}
            </Link>
          </h3>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <CourseActionsMenu
            courseId={course.id}
            courseName={course.name}
            isActive={course.isActive}
            onEdit={() => onEdit(course)}
            onArchiveRestore={() => onArchiveRestore(course)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 text-sm text-secondary-600">
        <p>
          {course.semester ? (
            course.semester.name
          ) : (
            <span className="text-secondary-400">No semester</span>
          )}
        </p>
        {course.instructor && <p>{course.instructor}</p>}
        {course.credits !== null && course.credits !== undefined && <p>{course.credits} credits</p>}
      </div>
    </article>
  );
}

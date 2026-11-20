export function createMockDb({
  users = [],
  courses = [],
  enrollments = [],
  materials = [],
  assignments = [],
  submissions = [],
  referencedUserIds = []
} = {}) {
  const withTimestamps = (item, fallbackDate = '2026-08-15T08:00:00Z') => ({
    created_at: new Date(fallbackDate),
    updated_at: new Date(fallbackDate),
    ...item
  });

  const state = {
    users: users.map((u) =>
      withTimestamps({ status: 'active', ...u })
    ),
    courses: courses.map((c) =>
      withTimestamps({
        description: null,
        term: 'First Semester 2026-2027',
        ...c
      })
    ),
    enrollments: enrollments.map((e) => ({
      status: 'active',
      enrolled_at: new Date('2026-08-18T09:00:00Z'),
      ...e
    })),
    materials: materials.map((m) =>
      withTimestamps({ description: null, ...m })
    ),
    assignments: assignments.map((a) =>
      withTimestamps({
        max_score: 100,
        attachment_file_name: null,
        attachment_s3_key: null,
        ...a
      })
    ),
    submissions: submissions.map((s) => ({
      student_note: null,
      score: null,
      feedback: null,
      status: 'submitted',
      submitted_at: new Date('2026-09-20T10:00:00Z'),
      graded_at: null,
      updated_at: new Date('2026-09-20T10:00:00Z'),
      ...s
    })),
    referencedUserIds: new Set(referencedUserIds),
    nextId: {
      users: users.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
      courses: courses.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
      enrollments:
        enrollments.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
      materials:
        materials.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
      assignments:
        assignments.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
      submissions:
        submissions.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1
    },
    failNextInsertOnTable: null,
    queries: []
  };

  const toPublicUserRow = (u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at
  });

  const likeToRegex = (pattern) => {
    const body = String(pattern)
      .replace(/^%|%$/g, '')
      .replace(/\\([%_\\])/g, '$1')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(body, 'i');
  };

  const db = {
    state,
    async execute(sql, params = []) {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      state.queries.push({ sql: normalizedSql, params });

      // ------------------------------------------------------------------
      // Health check
      // ------------------------------------------------------------------
      if (/^SELECT 1 AS ok$/i.test(normalizedSql)) {
        return [[{ ok: 1 }]];
      }

      // ------------------------------------------------------------------
      // Users
      // ------------------------------------------------------------------
      if (
        /^SELECT .* FROM users WHERE email = \?(?: LIMIT 1)?$/i.test(
          normalizedSql
        )
      ) {
        const email = params[0];
        const found = state.users.find((u) => u.email === email);
        return [found ? [{ ...found }] : []];
      }

      if (
        /^SELECT id FROM users WHERE id = \? AND role = 'instructor' AND status = 'active' LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const id = Number(params[0]);
        const found = state.users.find(
          (u) => u.id === id && u.role === 'instructor' && u.status === 'active'
        );
        return [found ? [{ id: found.id }] : []];
      }

      if (
        /^SELECT .* FROM users WHERE id = \?(?: LIMIT 1)?$/i.test(normalizedSql)
      ) {
        const id = Number(params[0]);
        const found = state.users.find((u) => u.id === id);
        return [found ? [toPublicUserRow(found)] : []];
      }

      if (
        /^SELECT .* FROM users WHERE role = \? ORDER BY created_at DESC, id DESC$/i.test(
          normalizedSql
        )
      ) {
        const role = params[0];
        const rows = state.users
          .filter((u) => u.role === role)
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at) || b.id - a.id
          )
          .map(toPublicUserRow);
        return [rows];
      }

      if (
        /^SELECT id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 5$/i.test(
          normalizedSql
        )
      ) {
        const rows = [...state.users]
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at) || b.id - a.id
          )
          .slice(0, 5)
          .map(toPublicUserRow);
        return [rows];
      }

      if (
        /^SELECT .* FROM users ORDER BY created_at DESC, id DESC$/i.test(
          normalizedSql
        )
      ) {
        const rows = [...state.users]
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at) || b.id - a.id
          )
          .map(toPublicUserRow);
        return [rows];
      }

      if (
        /^INSERT INTO users \(full_name, email, password_hash, role, status\) VALUES \(\?, \?, \?, \?, \?\)$/i.test(
          normalizedSql
        )
      ) {
        const [full_name, email, password_hash, role, status] = params;
        if (state.users.some((u) => u.email === email)) {
          const dupErr = new Error(`Duplicate entry '${email}'`);
          dupErr.code = 'ER_DUP_ENTRY';
          dupErr.errno = 1062;
          throw dupErr;
        }
        const now = new Date();
        const id = state.nextId.users++;
        state.users.push({
          id,
          full_name,
          email,
          password_hash,
          role,
          status,
          created_at: now,
          updated_at: now
        });
        return [{ insertId: id, affectedRows: 1 }];
      }

      const updateUserMatch = normalizedSql.match(
        /^UPDATE users SET (.+) WHERE id = \?$/i
      );
      if (updateUserMatch) {
        const setParts = updateUserMatch[1].split(',').map((p) => p.trim());
        const id = Number(params[params.length - 1]);
        const target = state.users.find((u) => u.id === id);
        if (!target) return [{ affectedRows: 0 }];
        setParts.forEach((clause, idx) => {
          const col = clause.split('=')[0].trim();
          target[col] = params[idx];
        });
        target.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }

      if (
        /^UPDATE users SET password_hash = \? WHERE email LIKE \?$/i.test(
          normalizedSql
        )
      ) {
        const [passwordHash, likePattern] = params;
        const suffix = likePattern.replace(/^%/, '');
        let affectedRows = 0;
        for (const u of state.users) {
          if (u.email.endsWith(suffix)) {
            u.password_hash = passwordHash;
            affectedRows++;
          }
        }
        return [{ affectedRows }];
      }

      if (/^DELETE FROM users WHERE id = \?$/i.test(normalizedSql)) {
        const id = Number(params[0]);
        if (
          state.referencedUserIds.has(id) ||
          state.courses.some((c) => c.instructor_id === id) ||
          state.materials.some((m) => m.uploaded_by === id) ||
          state.assignments.some((a) => a.created_by === id)
        ) {
          const fkErr = new Error('Cannot delete or update a parent row');
          fkErr.code = 'ER_ROW_IS_REFERENCED_2';
          fkErr.errno = 1451;
          throw fkErr;
        }
        const idx = state.users.findIndex((u) => u.id === id);
        if (idx === -1) return [{ affectedRows: 0 }];
        state.users.splice(idx, 1);
        return [{ affectedRows: 1 }];
      }

      // ------------------------------------------------------------------
      // Courses
      // ------------------------------------------------------------------
      if (
        /^SELECT id, course_code, title, description, term, instructor_id, created_at, updated_at FROM courses WHERE id = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const id = Number(params[0]);
        const found = state.courses.find((c) => c.id === id);
        return [found ? [{ ...found }] : []];
      }

      if (
        /^SELECT id FROM courses WHERE course_code = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const code = params[0];
        const found = state.courses.find((c) => c.course_code === code);
        return [found ? [{ id: found.id }] : []];
      }

      if (
        /^SELECT c\.id, c\.course_code, c\.title, c\.description, c\.term, c\.instructor_id, u\.full_name AS instructor_name, COUNT\(DISTINCT CASE WHEN e_all\.status = 'active' THEN e_all\.id END\) AS active_student_count, MAX\(e_me\.status\) AS my_enrollment_status, c\.created_at, c\.updated_at FROM courses AS c/i.test(
          normalizedSql
        )
      ) {
        const userId = Number(params[0]);
        let idx = 1;
        let searchRegex = null;
        if (normalizedSql.includes('c.course_code LIKE ? OR c.title LIKE ?')) {
          searchRegex = likeToRegex(params[idx]);
          idx += 2;
        }
        const enrolledOnly = normalizedSql.includes(
          "e_me.status IN ('active', 'completed')"
        );
        let assignedInstructorId = null;
        if (normalizedSql.includes('c.instructor_id = ?')) {
          assignedInstructorId = Number(params[idx]);
        }

        const rows = state.courses
          .filter((c) => {
            if (
              searchRegex &&
              !searchRegex.test(c.course_code) &&
              !searchRegex.test(c.title)
            ) {
              return false;
            }
            const myEnroll = state.enrollments.find(
              (e) => e.course_id === c.id && e.student_id === userId
            );
            if (
              enrolledOnly &&
              (!myEnroll ||
                !['active', 'completed'].includes(myEnroll.status))
            ) {
              return false;
            }
            if (
              assignedInstructorId !== null &&
              c.instructor_id !== assignedInstructorId
            ) {
              return false;
            }
            return true;
          })
          .map((c) => {
            const inst = state.users.find((u) => u.id === c.instructor_id);
            const activeCount = state.enrollments.filter(
              (e) => e.course_id === c.id && e.status === 'active'
            ).length;
            const myEnroll = state.enrollments.find(
              (e) => e.course_id === c.id && e.student_id === userId
            );
            return {
              id: c.id,
              course_code: c.course_code,
              title: c.title,
              description: c.description,
              term: c.term,
              instructor_id: c.instructor_id,
              instructor_name: inst?.full_name ?? null,
              active_student_count: activeCount,
              my_enrollment_status: myEnroll?.status ?? null,
              created_at: c.created_at,
              updated_at: c.updated_at
            };
          })
          .sort((a, b) => a.course_code.localeCompare(b.course_code));

        return [rows];
      }

      if (
        /^SELECT c\.id, c\.course_code, c\.title, c\.description, c\.term, c\.instructor_id, u\.full_name AS instructor_name, u\.email AS instructor_email,/i.test(
          normalizedSql
        )
      ) {
        const userId = Number(params[0]);
        const courseId = Number(params[1]);
        const c = state.courses.find((item) => item.id === courseId);
        if (!c) return [[]];
        const inst = state.users.find((u) => u.id === c.instructor_id);
        const myEnroll = state.enrollments.find(
          (e) => e.course_id === c.id && e.student_id === userId
        );
        return [
          [
            {
              id: c.id,
              course_code: c.course_code,
              title: c.title,
              description: c.description,
              term: c.term,
              instructor_id: c.instructor_id,
              instructor_name: inst?.full_name ?? null,
              instructor_email: inst?.email ?? null,
              active_student_count: state.enrollments.filter(
                (e) => e.course_id === c.id && e.status === 'active'
              ).length,
              material_count: state.materials.filter(
                (m) => m.course_id === c.id
              ).length,
              assignment_count: state.assignments.filter(
                (a) => a.course_id === c.id
              ).length,
              my_enrollment_status: myEnroll?.status ?? null,
              created_at: c.created_at,
              updated_at: c.updated_at
            }
          ]
        ];
      }

      if (
        /^INSERT INTO courses \(course_code, title, description, term, instructor_id\) VALUES \(\?, \?, \?, \?, \?\)$/i.test(
          normalizedSql
        )
      ) {
        const [course_code, title, description, term, instructor_id] = params;
        if (state.courses.some((c) => c.course_code === course_code)) {
          const dupErr = new Error(`Duplicate entry '${course_code}'`);
          dupErr.code = 'ER_DUP_ENTRY';
          dupErr.errno = 1062;
          throw dupErr;
        }
        const now = new Date();
        const id = state.nextId.courses++;
        state.courses.push({
          id,
          course_code,
          title,
          description,
          term,
          instructor_id: Number(instructor_id),
          created_at: now,
          updated_at: now
        });
        return [{ insertId: id, affectedRows: 1 }];
      }

      const updateCourseMatch = normalizedSql.match(
        /^UPDATE courses SET (.+) WHERE id = \?$/i
      );
      if (updateCourseMatch) {
        const setParts = updateCourseMatch[1].split(',').map((p) => p.trim());
        const id = Number(params[params.length - 1]);
        const target = state.courses.find((c) => c.id === id);
        if (!target) return [{ affectedRows: 0 }];
        const nextValues = {};
        setParts.forEach((clause, idx) => {
          const col = clause.split('=')[0].trim();
          nextValues[col] = params[idx];
        });
        if (
          nextValues.course_code &&
          state.courses.some(
            (c) => c.course_code === nextValues.course_code && c.id !== id
          )
        ) {
          const dupErr = new Error('Duplicate course_code');
          dupErr.code = 'ER_DUP_ENTRY';
          dupErr.errno = 1062;
          throw dupErr;
        }
        Object.assign(target, nextValues);
        target.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }

      if (
        /^SELECT s3_key FROM materials WHERE course_id = \?$/i.test(
          normalizedSql
        )
      ) {
        const courseId = Number(params[0]);
        return [
          state.materials
            .filter((m) => m.course_id === courseId)
            .map((m) => ({ s3_key: m.s3_key }))
        ];
      }

      if (
        /^SELECT attachment_s3_key FROM assignments WHERE course_id = \? AND attachment_s3_key IS NOT NULL$/i.test(
          normalizedSql
        )
      ) {
        const courseId = Number(params[0]);
        return [
          state.assignments
            .filter((a) => a.course_id === courseId && a.attachment_s3_key)
            .map((a) => ({ attachment_s3_key: a.attachment_s3_key }))
        ];
      }

      if (
        /^SELECT s\.s3_key FROM submissions AS s INNER JOIN assignments AS a ON a\.id = s\.assignment_id WHERE a\.course_id = \?$/i.test(
          normalizedSql
        )
      ) {
        const courseId = Number(params[0]);
        const assignmentIds = new Set(
          state.assignments
            .filter((a) => a.course_id === courseId)
            .map((a) => a.id)
        );
        return [
          state.submissions
            .filter((s) => assignmentIds.has(s.assignment_id))
            .map((s) => ({ s3_key: s.s3_key }))
        ];
      }

      if (/^DELETE FROM courses WHERE id = \?$/i.test(normalizedSql)) {
        const courseId = Number(params[0]);
        const idx = state.courses.findIndex((c) => c.id === courseId);
        if (idx === -1) return [{ affectedRows: 0 }];
        state.courses.splice(idx, 1);
        state.enrollments = state.enrollments.filter(
          (e) => e.course_id !== courseId
        );
        state.materials = state.materials.filter(
          (m) => m.course_id !== courseId
        );
        const removedAssignmentIds = new Set(
          state.assignments
            .filter((a) => a.course_id === courseId)
            .map((a) => a.id)
        );
        state.assignments = state.assignments.filter(
          (a) => a.course_id !== courseId
        );
        state.submissions = state.submissions.filter(
          (s) => !removedAssignmentIds.has(s.assignment_id)
        );
        return [{ affectedRows: 1 }];
      }

      // ------------------------------------------------------------------
      // Enrollments
      // ------------------------------------------------------------------
      if (
        /^SELECT id, status FROM enrollments WHERE student_id = \? AND course_id = \? AND status IN \('active', 'completed'\) LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const [studentId, courseId] = params.map(Number);
        const found = state.enrollments.find(
          (e) =>
            e.student_id === studentId &&
            e.course_id === courseId &&
            ['active', 'completed'].includes(e.status)
        );
        return [found ? [{ id: found.id, status: found.status }] : []];
      }

      if (
        /^SELECT id FROM enrollments WHERE student_id = \? AND course_id = \? AND status = 'active' LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const [studentId, courseId] = params.map(Number);
        const found = state.enrollments.find(
          (e) =>
            e.student_id === studentId &&
            e.course_id === courseId &&
            e.status === 'active'
        );
        return [found ? [{ id: found.id }] : []];
      }

      if (
        /^SELECT id, student_id, course_id, status, enrolled_at FROM enrollments WHERE student_id = \? AND course_id = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const [studentId, courseId] = params.map(Number);
        const found = state.enrollments.find(
          (e) => e.student_id === studentId && e.course_id === courseId
        );
        return [found ? [{ ...found }] : []];
      }

      if (
        /^SELECT id, student_id, course_id, status, enrolled_at FROM enrollments WHERE id = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const id = Number(params[0]);
        const found = state.enrollments.find((e) => e.id === id);
        return [found ? [{ ...found }] : []];
      }

      if (
        /^UPDATE enrollments SET status = 'active', enrolled_at = CURRENT_TIMESTAMP WHERE id = \?$/i.test(
          normalizedSql
        )
      ) {
        const id = Number(params[0]);
        const target = state.enrollments.find((e) => e.id === id);
        if (!target) return [{ affectedRows: 0 }];
        target.status = 'active';
        target.enrolled_at = new Date();
        return [{ affectedRows: 1 }];
      }

      if (
        /^INSERT INTO enrollments \(student_id, course_id, status\) VALUES \(\?, \?, 'active'\)$/i.test(
          normalizedSql
        )
      ) {
        const [student_id, course_id] = params.map(Number);
        const id = state.nextId.enrollments++;
        state.enrollments.push({
          id,
          student_id,
          course_id,
          status: 'active',
          enrolled_at: new Date()
        });
        return [{ insertId: id, affectedRows: 1 }];
      }

      if (
        /^DELETE FROM enrollments WHERE student_id = \? AND course_id = \?$/i.test(
          normalizedSql
        )
      ) {
        const [studentId, courseId] = params.map(Number);
        const idx = state.enrollments.findIndex(
          (e) => e.student_id === studentId && e.course_id === courseId
        );
        if (idx === -1) return [{ affectedRows: 0 }];
        state.enrollments.splice(idx, 1);
        return [{ affectedRows: 1 }];
      }

      if (
        /^SELECT e\.id AS enrollment_id, u\.id AS student_id, u\.full_name, u\.email, e\.status, e\.enrolled_at FROM enrollments AS e/i.test(
          normalizedSql
        )
      ) {
        const courseId = Number(params[0]);
        const rows = state.enrollments
          .filter((e) => e.course_id === courseId)
          .map((e) => {
            const u = state.users.find((usr) => usr.id === e.student_id);
            return {
              enrollment_id: e.id,
              student_id: e.student_id,
              full_name: u?.full_name ?? '',
              email: u?.email ?? '',
              status: e.status,
              enrolled_at: e.enrolled_at
            };
          })
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        return [rows];
      }

      // ------------------------------------------------------------------
      // Materials
      // ------------------------------------------------------------------
      if (
        /^SELECT m\.id, m\.course_id, m\.uploaded_by, u\.full_name AS uploader_name, m\.title, m\.description, m\.file_name, m\.s3_key, m\.mime_type, m\.file_size, m\.created_at, m\.updated_at FROM materials AS m .* WHERE m\.id = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const id = Number(params[0]);
        const m = state.materials.find((item) => item.id === id);
        if (!m) return [[]];
        const u = state.users.find((usr) => usr.id === m.uploaded_by);
        return [[{ ...m, uploader_name: u?.full_name ?? null }]];
      }

      if (
        /^SELECT m\.id, m\.course_id, m\.uploaded_by, u\.full_name AS uploader_name, m\.title, m\.description, m\.file_name, m\.s3_key, m\.mime_type, m\.file_size, m\.created_at, m\.updated_at FROM materials AS m .* WHERE m\.course_id = \?/i.test(
          normalizedSql
        )
      ) {
        const courseId = Number(params[0]);
        const rows = state.materials
          .filter((m) => m.course_id === courseId)
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at) || b.id - a.id
          )
          .map((m) => {
            const u = state.users.find((usr) => usr.id === m.uploaded_by);
            return { ...m, uploader_name: u?.full_name ?? null };
          });
        return [rows];
      }

      if (
        /^INSERT INTO materials \(course_id, uploaded_by, title, description, file_name, s3_key, mime_type, file_size\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)$/i.test(
          normalizedSql
        )
      ) {
        if (state.failNextInsertOnTable === 'materials') {
          state.failNextInsertOnTable = null;
          throw new Error('Simulated DB failure on materials insert');
        }
        const [
          course_id,
          uploaded_by,
          title,
          description,
          file_name,
          s3_key,
          mime_type,
          file_size
        ] = params;
        const now = new Date();
        const id = state.nextId.materials++;
        state.materials.push({
          id,
          course_id: Number(course_id),
          uploaded_by: Number(uploaded_by),
          title,
          description,
          file_name,
          s3_key,
          mime_type,
          file_size: Number(file_size),
          created_at: now,
          updated_at: now
        });
        return [{ insertId: id, affectedRows: 1 }];
      }

      const updateMaterialMatch = normalizedSql.match(
        /^UPDATE materials SET (.+) WHERE id = \?$/i
      );
      if (updateMaterialMatch) {
        const setParts = updateMaterialMatch[1].split(',').map((p) => p.trim());
        const id = Number(params[params.length - 1]);
        const target = state.materials.find((m) => m.id === id);
        if (!target) return [{ affectedRows: 0 }];
        setParts.forEach((clause, idx) => {
          const col = clause.split('=')[0].trim();
          target[col] = params[idx];
        });
        target.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }

      if (/^DELETE FROM materials WHERE id = \?$/i.test(normalizedSql)) {
        const id = Number(params[0]);
        const idx = state.materials.findIndex((m) => m.id === id);
        if (idx === -1) return [{ affectedRows: 0 }];
        state.materials.splice(idx, 1);
        return [{ affectedRows: 1 }];
      }

      // ------------------------------------------------------------------
      // Assignments
      // ------------------------------------------------------------------
      if (
        /^SELECT a\.id, a\.course_id, a\.created_by, u\.full_name AS creator_name, a\.title, a\.instructions, a\.due_date, a\.max_score, a\.attachment_file_name, a\.attachment_s3_key, a\.created_at, a\.updated_at FROM assignments AS a .* WHERE a\.id = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const id = Number(params[0]);
        const a = state.assignments.find((item) => item.id === id);
        if (!a) return [[]];
        const u = state.users.find((usr) => usr.id === a.created_by);
        return [[{ ...a, creator_name: u?.full_name ?? null }]];
      }

      if (
        /^SELECT a\.id, a\.course_id, a\.created_by, u\.full_name AS creator_name, .* s\.id AS my_submission_id,.* FROM assignments AS a/i.test(
          normalizedSql
        )
      ) {
        const studentId = Number(params[0]);
        const courseId = Number(params[1]);
        const rows = state.assignments
          .filter((a) => a.course_id === courseId)
          .sort(
            (a, b) => new Date(a.due_date) - new Date(b.due_date) || a.id - b.id
          )
          .map((a) => {
            const u = state.users.find((usr) => usr.id === a.created_by);
            const sub = state.submissions.find(
              (s) => s.assignment_id === a.id && s.student_id === studentId
            );
            return {
              ...a,
              creator_name: u?.full_name ?? null,
              my_submission_id: sub?.id ?? null,
              my_submission_file_name: sub?.file_name ?? null,
              my_submission_status: sub?.status ?? null,
              my_submission_score: sub?.score ?? null,
              my_submission_feedback: sub?.feedback ?? null,
              my_submission_submitted_at: sub?.submitted_at ?? null,
              my_submission_graded_at: sub?.graded_at ?? null
            };
          });
        return [rows];
      }

      if (
        /^SELECT a\.id, a\.course_id, a\.created_by, u\.full_name AS creator_name, .* COUNT\(s\.id\) AS submission_count/i.test(
          normalizedSql
        )
      ) {
        const courseId = Number(params[0]);
        const rows = state.assignments
          .filter((a) => a.course_id === courseId)
          .sort(
            (a, b) => new Date(a.due_date) - new Date(b.due_date) || a.id - b.id
          )
          .map((a) => {
            const u = state.users.find((usr) => usr.id === a.created_by);
            const subs = state.submissions.filter(
              (s) => s.assignment_id === a.id
            );
            return {
              ...a,
              creator_name: u?.full_name ?? null,
              submission_count: subs.length,
              graded_count: subs.filter((s) => s.status === 'graded').length
            };
          });
        return [rows];
      }

      if (
        /^INSERT INTO assignments \(course_id, created_by, title, instructions, due_date, max_score, attachment_file_name, attachment_s3_key\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)$/i.test(
          normalizedSql
        )
      ) {
        const [
          course_id,
          created_by,
          title,
          instructions,
          due_date,
          max_score,
          attachment_file_name,
          attachment_s3_key
        ] = params;
        const now = new Date();
        const id = state.nextId.assignments++;
        state.assignments.push({
          id,
          course_id: Number(course_id),
          created_by: Number(created_by),
          title,
          instructions,
          due_date,
          max_score: Number(max_score),
          attachment_file_name,
          attachment_s3_key,
          created_at: now,
          updated_at: now
        });
        return [{ insertId: id, affectedRows: 1 }];
      }

      const updateAssignmentMatch = normalizedSql.match(
        /^UPDATE assignments SET (.+) WHERE id = \?$/i
      );
      if (updateAssignmentMatch) {
        const setParts = updateAssignmentMatch[1]
          .split(',')
          .map((p) => p.trim());
        const id = Number(params[params.length - 1]);
        const target = state.assignments.find((a) => a.id === id);
        if (!target) return [{ affectedRows: 0 }];
        setParts.forEach((clause, idx) => {
          const col = clause.split('=')[0].trim();
          target[col] = params[idx];
        });
        target.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }

      if (
        /^SELECT s3_key FROM submissions WHERE assignment_id = \?$/i.test(
          normalizedSql
        )
      ) {
        const assignmentId = Number(params[0]);
        return [
          state.submissions
            .filter((s) => s.assignment_id === assignmentId)
            .map((s) => ({ s3_key: s.s3_key }))
        ];
      }

      if (/^DELETE FROM assignments WHERE id = \?$/i.test(normalizedSql)) {
        const id = Number(params[0]);
        const idx = state.assignments.findIndex((a) => a.id === id);
        if (idx === -1) return [{ affectedRows: 0 }];
        state.assignments.splice(idx, 1);
        state.submissions = state.submissions.filter(
          (s) => s.assignment_id !== id
        );
        return [{ affectedRows: 1 }];
      }

      // ------------------------------------------------------------------
      // Submissions
      // ------------------------------------------------------------------
      if (
        /^SELECT id, s3_key, status FROM submissions WHERE assignment_id = \? AND student_id = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const [assignmentId, studentId] = params.map(Number);
        const found = state.submissions.find(
          (s) => s.assignment_id === assignmentId && s.student_id === studentId
        );
        return [
          found
            ? [{ id: found.id, s3_key: found.s3_key, status: found.status }]
            : []
        ];
      }

      if (
        /^SELECT s\.id, s\.assignment_id, s\.student_id, .* FROM submissions AS s INNER JOIN assignments AS a ON a\.id = s\.assignment_id INNER JOIN courses AS c ON c\.id = a\.course_id INNER JOIN users AS u ON u\.id = s\.student_id WHERE s\.id = \? LIMIT 1$/i.test(
          normalizedSql
        )
      ) {
        const id = Number(params[0]);
        const s = state.submissions.find((item) => item.id === id);
        if (!s) return [[]];
        const a = state.assignments.find((asn) => asn.id === s.assignment_id);
        const c = state.courses.find((crs) => crs.id === a?.course_id);
        const u = state.users.find((usr) => usr.id === s.student_id);
        return [
          [
            {
              ...s,
              assignment_title: a?.title ?? null,
              max_score: a?.max_score ?? 100,
              course_id: c?.id ?? null,
              course_code: c?.course_code ?? null,
              course_title: c?.title ?? null,
              instructor_id: c?.instructor_id ?? null,
              student_name: u?.full_name ?? null,
              student_email: u?.email ?? null
            }
          ]
        ];
      }

      if (
        /^SELECT s\.id, s\.assignment_id, a\.title AS assignment_title, a\.max_score, c\.id AS course_id, c\.course_code, c\.title AS course_title, s\.student_id, u\.full_name AS student_name, u\.email AS student_email,/i.test(
          normalizedSql
        )
      ) {
        let idx = 0;
        let instructorId = null;
        let status = null;
        let courseId = null;
        if (normalizedSql.includes('c.instructor_id = ?')) {
          instructorId = Number(params[idx++]);
        }
        if (normalizedSql.includes('s.status = ?')) {
          status = params[idx++];
        }
        if (normalizedSql.includes('c.id = ?')) {
          courseId = Number(params[idx++]);
        }

        const rows = state.submissions
          .map((s) => {
            const a = state.assignments.find((asn) => asn.id === s.assignment_id);
            const c = state.courses.find((crs) => crs.id === a?.course_id);
            const u = state.users.find((usr) => usr.id === s.student_id);
            return { s, a, c, u };
          })
          .filter(({ s, c }) => {
            if (instructorId !== null && c?.instructor_id !== instructorId) {
              return false;
            }
            if (status && s.status !== status) return false;
            if (courseId !== null && c?.id !== courseId) return false;
            return true;
          })
          .sort(
            (x, y) =>
              new Date(y.s.submitted_at) - new Date(x.s.submitted_at) ||
              y.s.id - x.s.id
          )
          .map(({ s, a, c, u }) => ({
            ...s,
            assignment_title: a?.title ?? null,
            max_score: a?.max_score ?? 100,
            course_id: c?.id ?? null,
            course_code: c?.course_code ?? null,
            course_title: c?.title ?? null,
            student_name: u?.full_name ?? null,
            student_email: u?.email ?? null
          }));
        return [rows];
      }

      if (
        /^SELECT s\.id, s\.assignment_id, s\.student_id, u\.full_name AS student_name, u\.email AS student_email, .* WHERE s\.assignment_id = \?/i.test(
          normalizedSql
        )
      ) {
        const assignmentId = Number(params[0]);
        const rows = state.submissions
          .filter((s) => s.assignment_id === assignmentId)
          .sort(
            (a, b) =>
              new Date(b.submitted_at) - new Date(a.submitted_at) || b.id - a.id
          )
          .map((s) => {
            const u = state.users.find((usr) => usr.id === s.student_id);
            return {
              ...s,
              student_name: u?.full_name ?? null,
              student_email: u?.email ?? null
            };
          });
        return [rows];
      }

      if (
        /^INSERT INTO submissions \(assignment_id, student_id, file_name, s3_key, mime_type, file_size, student_note, status\) VALUES \(\?, \?, \?, \?, \?, \?, \?, 'submitted'\)$/i.test(
          normalizedSql
        )
      ) {
        const [
          assignment_id,
          student_id,
          file_name,
          s3_key,
          mime_type,
          file_size,
          student_note
        ] = params;
        const now = new Date();
        const id = state.nextId.submissions++;
        state.submissions.push({
          id,
          assignment_id: Number(assignment_id),
          student_id: Number(student_id),
          file_name,
          s3_key,
          mime_type,
          file_size: Number(file_size),
          student_note,
          score: null,
          feedback: null,
          status: 'submitted',
          submitted_at: now,
          graded_at: null,
          updated_at: now
        });
        return [{ insertId: id, affectedRows: 1 }];
      }

      if (
        /^UPDATE submissions SET file_name = \?, s3_key = \?, mime_type = \?, file_size = \?, student_note = \?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = \?$/i.test(
          normalizedSql
        )
      ) {
        const [file_name, s3_key, mime_type, file_size, student_note, id] =
          params;
        const target = state.submissions.find((s) => s.id === Number(id));
        if (!target) return [{ affectedRows: 0 }];
        Object.assign(target, {
          file_name,
          s3_key,
          mime_type,
          file_size: Number(file_size),
          student_note,
          status: 'submitted',
          submitted_at: new Date(),
          updated_at: new Date()
        });
        return [{ affectedRows: 1 }];
      }

      if (
        /^UPDATE submissions SET score = \?, feedback = \?, status = \?, graded_at = NOW\(\) WHERE id = \?$/i.test(
          normalizedSql
        )
      ) {
        const [score, feedback, status, id] = params;
        const target = state.submissions.find((s) => s.id === Number(id));
        if (!target) return [{ affectedRows: 0 }];
        Object.assign(target, {
          score: Number(score),
          feedback,
          status,
          graded_at: new Date(),
          updated_at: new Date()
        });
        return [{ affectedRows: 1 }];
      }

      if (/^DELETE FROM submissions WHERE id = \?$/i.test(normalizedSql)) {
        const id = Number(params[0]);
        const idx = state.submissions.findIndex((s) => s.id === id);
        if (idx === -1) return [{ affectedRows: 0 }];
        state.submissions.splice(idx, 1);
        return [{ affectedRows: 1 }];
      }

      // ------------------------------------------------------------------
      // Records & Dashboard Summary
      // ------------------------------------------------------------------
      if (
        /^SELECT c\.id AS course_id, c\.course_code, c\.title AS course_title, u\.full_name AS instructor_name, e\.status AS enrollment_status, a\.id AS assignment_id,/i.test(
          normalizedSql
        )
      ) {
        const studentId = Number(params[0]);
        const myEnrollments = state.enrollments.filter(
          (e) =>
            e.student_id === studentId &&
            ['active', 'completed'].includes(e.status)
        );
        const rows = [];
        for (const e of myEnrollments) {
          const c = state.courses.find((crs) => crs.id === e.course_id);
          if (!c) continue;
          const inst = state.users.find((u) => u.id === c.instructor_id);
          const courseAssignments = state.assignments.filter(
            (a) => a.course_id === c.id
          );
          if (courseAssignments.length === 0) {
            rows.push({
              course_id: c.id,
              course_code: c.course_code,
              course_title: c.title,
              instructor_name: inst?.full_name ?? '',
              enrollment_status: e.status,
              assignment_id: null,
              assignment_title: null,
              due_date: null,
              max_score: null,
              submission_id: null,
              submission_status: null,
              score: null,
              feedback: null,
              submitted_at: null,
              graded_at: null
            });
          } else {
            for (const a of courseAssignments) {
              const s = state.submissions.find(
                (sub) =>
                  sub.assignment_id === a.id && sub.student_id === studentId
              );
              rows.push({
                course_id: c.id,
                course_code: c.course_code,
                course_title: c.title,
                instructor_name: inst?.full_name ?? '',
                enrollment_status: e.status,
                assignment_id: a.id,
                assignment_title: a.title,
                due_date: a.due_date,
                max_score: a.max_score,
                submission_id: s?.id ?? null,
                submission_status: s?.status ?? null,
                score: s?.score ?? null,
                feedback: s?.feedback ?? null,
                submitted_at: s?.submitted_at ?? null,
                graded_at: s?.graded_at ?? null
              });
            }
          }
        }
        rows.sort(
          (x, y) =>
            x.course_code.localeCompare(y.course_code) ||
            new Date(x.due_date || 0) - new Date(y.due_date || 0) ||
            (x.assignment_id || 0) - (y.assignment_id || 0)
        );
        return [rows];
      }

      if (
        /^SELECT a\.id AS assignment_id, a\.title, a\.due_date, a\.max_score, c\.id AS course_id, c\.course_code, c\.title AS course_title FROM enrollments AS e/i.test(
          normalizedSql
        )
      ) {
        const studentId = Number(params[0]);
        const enrolledCourseIds = new Set(
          state.enrollments
            .filter(
              (e) =>
                e.student_id === studentId &&
                ['active', 'completed'].includes(e.status)
            )
            .map((e) => e.course_id)
        );
        const rows = state.assignments
          .filter((a) => {
            if (!enrolledCourseIds.has(a.course_id)) return false;
            return !state.submissions.some(
              (s) => s.assignment_id === a.id && s.student_id === studentId
            );
          })
          .sort(
            (a, b) => new Date(a.due_date) - new Date(b.due_date) || a.id - b.id
          )
          .slice(0, 5)
          .map((a) => {
            const c = state.courses.find((crs) => crs.id === a.course_id);
            return {
              assignment_id: a.id,
              title: a.title,
              due_date: a.due_date,
              max_score: a.max_score,
              course_id: c.id,
              course_code: c.course_code,
              course_title: c.title
            };
          });
        return [rows];
      }

      if (
        /^SELECT s\.id AS submission_id, a\.id AS assignment_id, a\.title AS assignment_title, a\.max_score, c\.id AS course_id, c\.course_code, s\.score, s\.feedback, s\.status, s\.graded_at FROM submissions AS s/i.test(
          normalizedSql
        )
      ) {
        const studentId = Number(params[0]);
        const rows = state.submissions
          .filter(
            (s) =>
              s.student_id === studentId &&
              ['graded', 'returned'].includes(s.status) &&
              s.score !== null
          )
          .sort(
            (a, b) =>
              new Date(b.graded_at || 0) - new Date(a.graded_at || 0) ||
              b.id - a.id
          )
          .slice(0, 5)
          .map((s) => {
            const a = state.assignments.find((asn) => asn.id === s.assignment_id);
            const c = state.courses.find((crs) => crs.id === a?.course_id);
            return {
              submission_id: s.id,
              assignment_id: a.id,
              assignment_title: a.title,
              max_score: a.max_score,
              course_id: c.id,
              course_code: c.course_code,
              score: s.score,
              feedback: s.feedback,
              status: s.status,
              graded_at: s.graded_at
            };
          });
        return [rows];
      }

      if (
        /^SELECT c\.id, c\.course_code, c\.title, c\.term, COUNT\(DISTINCT CASE WHEN e\.status = 'active' THEN e\.id END\) AS active_student_count FROM courses AS c/i.test(
          normalizedSql
        )
      ) {
        const instructorId = Number(params[0]);
        const rows = state.courses
          .filter((c) => c.instructor_id === instructorId)
          .sort((a, b) => a.course_code.localeCompare(b.course_code))
          .map((c) => ({
            id: c.id,
            course_code: c.course_code,
            title: c.title,
            term: c.term,
            active_student_count: state.enrollments.filter(
              (e) => e.course_id === c.id && e.status === 'active'
            ).length
          }));
        return [rows];
      }

      if (
        /^SELECT COUNT\(DISTINCT CASE WHEN s\.status = 'submitted' THEN s\.id END\) AS pending_to_grade, COUNT\(DISTINCT CASE WHEN e\.status = 'active' THEN e\.student_id END\) AS total_students FROM courses AS c/i.test(
          normalizedSql
        )
      ) {
        const instructorId = Number(params[0]);
        const myCourseIds = new Set(
          state.courses
            .filter((c) => c.instructor_id === instructorId)
            .map((c) => c.id)
        );
        const myAssignmentIds = new Set(
          state.assignments
            .filter((a) => myCourseIds.has(a.course_id))
            .map((a) => a.id)
        );
        const pending_to_grade = state.submissions.filter(
          (s) => myAssignmentIds.has(s.assignment_id) && s.status === 'submitted'
        ).length;
        const total_students = new Set(
          state.enrollments
            .filter((e) => myCourseIds.has(e.course_id) && e.status === 'active')
            .map((e) => e.student_id)
        ).size;
        return [[{ pending_to_grade, total_students }]];
      }

      if (
        /^SELECT s\.id AS submission_id, a\.id AS assignment_id, a\.title AS assignment_title, c\.id AS course_id, c\.course_code, u\.id AS student_id, u\.full_name AS student_name, s\.file_name, s\.status, s\.submitted_at FROM submissions AS s/i.test(
          normalizedSql
        )
      ) {
        const instructorId = Number(params[0]);
        const myCourseIds = new Set(
          state.courses
            .filter((c) => c.instructor_id === instructorId)
            .map((c) => c.id)
        );
        const rows = state.submissions
          .map((s) => {
            const a = state.assignments.find((asn) => asn.id === s.assignment_id);
            const c = state.courses.find((crs) => crs.id === a?.course_id);
            const u = state.users.find((usr) => usr.id === s.student_id);
            return { s, a, c, u };
          })
          .filter(({ c }) => c && myCourseIds.has(c.id))
          .sort(
            (x, y) =>
              new Date(y.s.submitted_at) - new Date(x.s.submitted_at) ||
              y.s.id - x.s.id
          )
          .slice(0, 5)
          .map(({ s, a, c, u }) => ({
            submission_id: s.id,
            assignment_id: a.id,
            assignment_title: a.title,
            course_id: c.id,
            course_code: c.course_code,
            student_id: u.id,
            student_name: u.full_name,
            file_name: s.file_name,
            status: s.status,
            submitted_at: s.submitted_at
          }));
        return [rows];
      }

      if (
        /^SELECT \(SELECT COUNT\(\*\) FROM users\) AS total_users, \(SELECT COUNT\(\*\) FROM courses\) AS total_courses, \(SELECT COUNT\(\*\) FROM enrollments WHERE status = 'active'\) AS total_enrollments$/i.test(
          normalizedSql
        )
      ) {
        return [
          [
            {
              total_users: state.users.length,
              total_courses: state.courses.length,
              total_enrollments: state.enrollments.filter(
                (e) => e.status === 'active'
              ).length
            }
          ]
        ];
      }

      if (
        /^SELECT c\.id, c\.course_code, c\.title, c\.term, u\.full_name AS instructor_name, c\.created_at FROM courses AS c INNER JOIN users AS u ON u\.id = c\.instructor_id ORDER BY c\.created_at DESC, c\.id DESC LIMIT 5$/i.test(
          normalizedSql
        )
      ) {
        const rows = [...state.courses]
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at) || b.id - a.id
          )
          .slice(0, 5)
          .map((c) => {
            const u = state.users.find((usr) => usr.id === c.instructor_id);
            return {
              id: c.id,
              course_code: c.course_code,
              title: c.title,
              term: c.term,
              instructor_name: u?.full_name ?? '',
              created_at: c.created_at
            };
          });
        return [rows];
      }

      throw new Error(`Unhandled SQL in mockDb: ${normalizedSql}`);
    }
  };

  return db;
}

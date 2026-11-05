const state = {
  client: null,
  user: null,
  profile: null,
  role: "student",
  subjects: [],
  year: 1,
  semester: 1,
  authMode: "signup",
  toastTimer: null,
  dashboardPromise: null,
  dashboardPromiseUserId: null,
  dashboardReady: false,
  authRoleMode: new URLSearchParams(window.location.search).get("admin") === "1" ? "admin" : "student",
  dedicatedAdminLogin: new URLSearchParams(window.location.search).get("admin") === "1",
  studentAuthMode: "signup"
};

const byId = (id) => document.getElementById(id);
const authView = byId("auth-view");
const appView = byId("app-view");

function setAuthMessage(message, success = false) {
  const element = byId("auth-message");
  element.textContent = message;
  element.classList.toggle("is-success", success);
}

function setSubjectMessage(message, error = true) {
  const element = byId("subject-message");
  element.textContent = message;
  element.style.color = error ? "#bd4d4d" : "#2a8660";
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function setAuthMode(mode) {
  if (state.authRoleMode === "student") {
    state.studentAuthMode = mode;
  }
  if (state.authRoleMode === "admin") {
    mode = "signin";
  }
  state.authMode = mode;
  const isSignup = mode === "signup";
  byId("profile-fields").hidden = !isSignup;
  byId("profile-fields").querySelectorAll("input, select").forEach((input) => {
    input.required = isSignup;
  });
  byId("password").autocomplete = isSignup ? "new-password" : "current-password";
  byId("auth-eyebrow").textContent = state.authRoleMode === "admin"
    ? "ADMINISTRATOR ACCESS"
    : isSignup ? "GET STARTED" : "WELCOME BACK";
  byId("auth-title").textContent = state.authRoleMode === "admin"
    ? "Administrator sign in"
    : isSignup ? "Create your account" : "Sign in to Gradebook";
  byId("auth-description").textContent = state.authRoleMode === "admin"
    ? "Sign in with your authorized administrator account to review student records."
    : isSignup
      ? "Set up your student profile to start tracking your grades."
      : "Pick up where you left off and check your academic progress.";
  byId("auth-submit").textContent = isSignup ? "Create account →" : "Sign in →";
  byId("auth-switch-label").textContent = isSignup
    ? "Already have an account?"
    : "New to Gradebook?";
  byId("auth-switch").textContent = isSignup ? "Sign in" : "Create account";
  byId("auth-switch").hidden = state.authRoleMode === "admin";
  byId("auth-switch-label").hidden = state.authRoleMode === "admin";
  byId("admin-login-link").hidden = state.authRoleMode === "admin";
  byId("student-login-link").hidden = state.authRoleMode !== "admin";
  byId("auth-role-switch").hidden = state.dedicatedAdminLogin;
  setAuthMessage("");
}

function setAuthRoleMode(mode) {
  state.authRoleMode = mode;
  const isAdmin = mode === "admin";
  byId("student-auth-mode").classList.toggle("is-active", !isAdmin);
  byId("student-auth-mode").setAttribute("aria-pressed", String(!isAdmin));
  byId("admin-auth-mode").classList.toggle("is-active", isAdmin);
  byId("admin-auth-mode").setAttribute("aria-pressed", String(isAdmin));
  byId("auth-switch").hidden = isAdmin;
  byId("auth-switch-label").hidden = isAdmin;
  setAuthMode(isAdmin ? "signin" : state.studentAuthMode);
}

function populateTermSelectors() {
  ["term-year", "sgpa-year", "profile-academic-year", "profile-semester-number"].forEach((id) => {
    const select = byId(id);
    select.replaceChildren();
    const optionCount = id === "profile-semester-number" ? 8 : 4;
    for (let year = 1; year <= optionCount; year += 1) {
      const option = document.createElement("option");
      option.value = String(year);
      const isSemester = id === "profile-semester-number";
      option.textContent = isSemester ? `Semester ${year}` : `Year ${year}`;
      select.append(option);
    }
  });
  ["term-semester", "sgpa-semester"].forEach((id) => {
    const select = byId(id);
    select.replaceChildren();
    for (let semester = 1; semester <= 8; semester += 1) {
      const option = document.createElement("option");
      option.value = String(semester);
      option.textContent = `Semester ${semester}`;
      select.append(option);
    }
  });

  [["term-year", "year"], ["sgpa-year", "year"], ["term-semester", "semester"], ["sgpa-semester", "semester"]]
    .forEach(([id, field]) => {
      byId(id).addEventListener("change", (event) => {
        state[field] = Number(event.target.value);
        syncTermSelectors();
        renderDashboard();
      });
    });
}

function syncTermSelectors() {
  ["term-year", "sgpa-year"].forEach((id) => { byId(id).value = String(state.year); });
  ["term-semester", "sgpa-semester"].forEach((id) => { byId(id).value = String(state.semester); });
  const label = `Year ${state.year} · Semester ${state.semester}`;
  byId("term-badge-label").textContent = label;
  byId("current-term-label").textContent = label.toUpperCase();
}

function setActiveView(viewName) {
  const labels = {
    subjects: "Subjects",
    profile: "Student details",
    sgpa: "Semester GPA",
    cgpa: "Cumulative GPA",
    "admin-students": "Students"
  };
  document.querySelectorAll(".nav-item").forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  const isAdminView = viewName === "admin-students";
  byId("student-dashboard-content").hidden = isAdminView;
  byId("admin-students-view").hidden = !isAdminView;
  byId("breadcrumb-current").textContent = labels[viewName];
  if (isAdminView) {
    byId("page-title").textContent = "Student records";
    byId("page-subtitle").textContent = "Review student academic profiles.";
    return;
  }
  byId("page-title").textContent = viewName === "subjects"
    ? "Your subjects"
    : viewName === "profile" ? "Student details"
      : viewName === "sgpa" ? "Semester GPA" : "Cumulative GPA";
  byId("page-subtitle").textContent = viewName === "subjects"
    ? "Add your courses and keep your semester in one place."
    : viewName === "profile" ? "View and update your student details."
      : viewName === "sgpa"
        ? "See your credit-weighted result for a selected semester."
        : "Understand your overall progress across recorded semesters.";
  byId("subjects-view").hidden = viewName !== "subjects";
  byId("profile-view").hidden = viewName !== "profile";
  byId("sgpa-view").hidden = viewName !== "sgpa";
  byId("cgpa-view").hidden = viewName !== "cgpa";
}

function currentTermSubjects() {
  return state.subjects.filter((subject) =>
    subject.academic_year === state.year && subject.semester_number === state.semester
  );
}

function calculateGpa(subjects) {
  const totals = subjects.reduce((result, subject) => {
    const credits = Number(subject.credits);
    result.credits += credits;
    result.weightedPoints += credits * Number(subject.grade_points);
    return result;
  }, { credits: 0, weightedPoints: 0 });

  return {
    ...totals,
    gpa: totals.credits > 0 ? totals.weightedPoints / totals.credits : null
  };
}

function formatNumber(number, decimals = 2) {
  return String(Number(Number(number).toFixed(decimals)));
}

function renderSubjectRows() {
  const rows = byId("subject-rows");
  rows.replaceChildren();
  const subjects = currentTermSubjects();
  byId("empty-subjects").hidden = subjects.length !== 0;
  byId("subject-count").textContent = `${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"}`;

  subjects.forEach((subject) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = subject.name;
    const creditsCell = document.createElement("td");
    creditsCell.textContent = formatNumber(Number(subject.credits), 3);
    const pointsCell = document.createElement("td");
    const grade = document.createElement("span");
    grade.className = "grade-pill";
    grade.textContent = formatNumber(Number(subject.grade_points), 3);
    pointsCell.append(grade);
    const weightedCell = document.createElement("td");
    weightedCell.className = "weighted-value";
    weightedCell.textContent = formatNumber(Number(subject.credits) * Number(subject.grade_points), 3);
    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.className = "delete-button";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${subject.name}`);
    removeButton.title = "Remove subject";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => removeSubject(subject));
    actionCell.append(removeButton);
    row.append(nameCell, creditsCell, pointsCell, weightedCell, actionCell);
    rows.append(row);
  });

  const termGpa = calculateGpa(subjects);
  byId("table-sgpa").textContent = termGpa.gpa === null ? "—" : termGpa.gpa.toFixed(2);
}

function renderSemesterBreakdown() {
  const semesters = new Map();
  state.subjects.forEach((subject) => {
    const key = `${subject.academic_year}-${subject.semester_number}`;
    if (!semesters.has(key)) {
      semesters.set(key, {
        year: subject.academic_year,
        semester: subject.semester_number,
        subjects: []
      });
    }
    semesters.get(key).subjects.push(subject);
  });

  const breakdown = byId("semester-breakdown");
  breakdown.replaceChildren();
  const orderedSemesters = [...semesters.values()].sort((first, second) =>
    first.year - second.year || first.semester - second.semester
  );
  byId("semester-count-label").textContent =
    `${orderedSemesters.length} ${orderedSemesters.length === 1 ? "semester" : "semesters"}`;

  orderedSemesters.forEach((semester) => {
    const result = calculateGpa(semester.subjects);
    const card = document.createElement("div");
    card.className = "semester-card";
    const label = document.createElement("span");
    label.textContent = `Year ${semester.year} · Semester ${semester.semester}`;
    const gpa = document.createElement("strong");
    gpa.textContent = result.gpa.toFixed(2);
    card.append(label, gpa);
    breakdown.append(card);
  });
}

function renderDashboard() {
  const selectedSubjects = currentTermSubjects();
  const semester = calculateGpa(selectedSubjects);
  const cumulative = calculateGpa(state.subjects);
  const credits = state.subjects.reduce((sum, subject) => sum + Number(subject.credits), 0);

  byId("summary-sgpa").textContent = semester.gpa === null ? "—" : semester.gpa.toFixed(2);
  byId("summary-sgpa-caption").textContent = semester.gpa === null
    ? "No subjects this semester"
    : `${formatNumber(semester.credits, 3)} credits in selected semester`;
  byId("summary-cgpa").textContent = cumulative.gpa === null ? "—" : cumulative.gpa.toFixed(2);
  byId("summary-cgpa-caption").textContent = state.subjects.length === 0
    ? "Across all recorded semesters"
    : `${state.subjects.length} saved ${state.subjects.length === 1 ? "subject" : "subjects"}`;
  byId("summary-subjects").textContent = String(state.subjects.length);
  byId("summary-credits").textContent = `${formatNumber(credits, 3)} total credits`;

  byId("sgpa-result").textContent = semester.gpa === null ? "—" : semester.gpa.toFixed(2);
  byId("sgpa-detail").textContent = semester.gpa === null
    ? "Add subjects to this semester to calculate your result."
    : `Based on ${selectedSubjects.length} ${selectedSubjects.length === 1 ? "subject" : "subjects"} and ${formatNumber(semester.credits, 3)} credits.`;
  byId("cgpa-result").textContent = cumulative.gpa === null ? "—" : cumulative.gpa.toFixed(2);
  byId("cgpa-detail").textContent = cumulative.gpa === null
    ? "Add subjects across semesters to calculate your result."
    : `Based on ${state.subjects.length} subjects and ${formatNumber(cumulative.credits, 3)} total credits.`;

  renderSubjectRows();
  renderSemesterBreakdown();
}

function showProfile(profile) {
  byId("profile-full-name").value = profile.full_name;
  byId("profile-department").value = profile.department;
  byId("profile-academic-year").value = String(profile.academic_year);
  byId("profile-semester-number").value = String(profile.semester_number);
  byId("profile-email").value = state.user.email ?? profile.email;
}

function renderResultHistory(type, results) {
  const rows = byId(`${type}-history-rows`);
  const empty = byId(`empty-${type}-history`);
  rows.replaceChildren();
  empty.hidden = results.length !== 0;
  results.forEach((result) => {
    const row = document.createElement("tr");
    const values = type === "cgpa"
      ? [Number(result.cgpa).toFixed(2), formatNumber(Number(result.total_credits), 3),
        String(result.subject_count), new Date(result.created_at).toLocaleDateString()]
      : [String(result.academic_year), String(result.semester_number),
        Number(result[type]).toFixed(2), new Date(result.created_at).toLocaleDateString()];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    rows.append(row);
  });
}

function showResultHistoryError(type, error) {
  const rows = byId(`${type}-history-rows`);
  const empty = byId(`empty-${type}-history`);
  rows.replaceChildren();
  empty.textContent = `Could not load saved ${type.toUpperCase()} results. ${error.message}`;
  empty.hidden = false;
  console.error(error);
}

async function loadResultHistory(type) {
  const columns = type === "cgpa"
    ? "cgpa, total_credits, subject_count, created_at"
    : `${type}, academic_year, semester_number, created_at`;
  const { data, error } = await state.client
    .from(`${type}_results`)
    .select(columns)
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    showResultHistoryError(type, new Error(`Could not load saved ${type.toUpperCase()} results: ${error.message}`));
    return false;
  }
  renderResultHistory(type, data ?? []);
  return true;
}

async function saveResult(type) {
  const subjects = type === "cgpa" ? state.subjects : currentTermSubjects();
  const result = calculateGpa(subjects);
  if (result.gpa === null) {
    showToast(type === "cgpa"
      ? "Add subjects before saving a CGPA result."
      : "Add subjects to this semester before saving a result.");
    return;
  }

  const button = byId(`save-${type}-result`);
  button.disabled = true;
  try {
    const payload = {
      user_id: state.user.id,
      [type]: result.gpa,
      total_credits: result.credits,
      subject_count: subjects.length
    };
    if (type !== "cgpa") {
      payload.academic_year = state.year;
      payload.semester_number = state.semester;
    }
    const { error } = await state.client.from(`${type}_results`).insert(payload);
    if (error) {
      throw new Error(`Could not save this ${type.toUpperCase()} result: ${error.message}`);
    }
    const historyLoaded = await loadResultHistory(type);
    showToast(historyLoaded
      ? `${type.toUpperCase()} result saved.`
      : `${type.toUpperCase()} result saved, but its history could not be refreshed.`);
  } catch (error) {
    showToast(error.message || `Could not save this ${type.toUpperCase()} result.`);
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

async function loadSubjects() {
  const { data, error } = await state.client
    .from("subjects")
    .select("id, name, credits, grade_points, academic_year, semester_number")
    .eq("user_id", state.user.id)
    .order("academic_year", { ascending: true })
    .order("semester_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load your subjects: ${error.message}`);
  }
  state.subjects = data ?? [];
}

async function ensureProfile(user) {
  const { data: existingProfile, error: readError } = await state.client
    .from("profiles")
    .select("id, full_name, registration_number, email, department, academic_year, semester_number")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    throw new Error(`Could not load your profile: ${readError.message}`);
  }
  if (existingProfile) {
    return existingProfile;
  }

  const metadata = user.user_metadata ?? {};
  const profile = {
    id: user.id,
    full_name: String(metadata.full_name ?? "").trim(),
    registration_number: String(metadata.registration_number ?? "").trim(),
    email: String(user.email ?? "").trim(),
    department: String(metadata.department ?? "").trim(),
    academic_year: Number(metadata.academic_year),
    semester_number: Number(metadata.semester_number)
  };
  if (!profile.full_name || !profile.registration_number || !profile.email || !profile.department ||
      !Number.isInteger(profile.academic_year) || !Number.isInteger(profile.semester_number)) {
    throw new Error("Your student profile is incomplete, including its registration number. Please contact support.");
  }

  const { data, error } = await state.client
    .from("profiles")
    .insert(profile)
    .select("id, full_name, registration_number, email, department, academic_year, semester_number")
    .single();
  if (error) {
    throw new Error(`Could not save your student profile: ${error.message}`);
  }
  return data;
}

async function loadAdminStudents() {
  const message = byId("admin-students-message");
  message.textContent = "";
  const rows = byId("admin-student-rows");
  rows.replaceChildren();
  byId("empty-admin-students").hidden = true;
  byId("admin-student-count").textContent = "Loading students…";

  const students = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await state.client
      .from("profiles")
      .select("registration_number, full_name, email, department, academic_year, semester_number")
      .order("full_name", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      throw new Error(`Could not load student records: ${error.message}`);
    }
    students.push(...(data ?? []));
    if (!data || data.length < pageSize) {
      break;
    }
  }

  byId("admin-student-count").textContent =
    `${students.length} ${students.length === 1 ? "student" : "students"}`;
  byId("empty-admin-students").hidden = students.length !== 0;
  students.forEach((student) => {
    const row = document.createElement("tr");
    [student.registration_number || "—", student.full_name, student.email, student.department,
      `Year ${student.academic_year}`, `Semester ${student.semester_number}`]
      .forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
    rows.append(row);
  });
}

async function showDashboard(user) {
  if (state.dashboardReady && state.user?.id === user.id && !appView.hidden) {
    return;
  }
  if (state.dashboardPromise && state.dashboardPromiseUserId === user.id) {
    return state.dashboardPromise;
  }

  state.user = user;
  state.dashboardReady = false;
  state.role = user.app_metadata?.role === "admin" ? "admin" : "student";
  state.dashboardPromiseUserId = user.id;
  authView.hidden = true;
  appView.hidden = false;
  const isAdmin = state.role === "admin";
  byId("admin-students-nav").hidden = !isAdmin;
  document.querySelectorAll(".nav-item[data-view='subjects'], .nav-item[data-view='profile'], .nav-item[data-view='sgpa'], .nav-item[data-view='cgpa']")
    .forEach((button) => { button.hidden = isAdmin; });
  setActiveView(isAdmin ? "admin-students" : "subjects");
  byId("subject-rows").replaceChildren();
  byId("empty-subjects").hidden = true;
  byId("student-dashboard-content").hidden = isAdmin;
  byId("admin-students-view").hidden = !isAdmin;

  const dashboardPromise = (async () => {
    try {
      if (isAdmin) {
        byId("header-name").textContent = "Administrator";
        byId("header-department").textContent = user.email ?? "";
        byId("avatar-initials").textContent = "A";
        await loadAdminStudents();
        if (state.user?.id !== user.id) {
          return;
        }
        state.dashboardReady = true;
        return;
      }

      const profile = await ensureProfile(user);
      if (state.user?.id !== user.id) {
        return;
      }

      state.profile = profile;
      state.year = profile.academic_year;
      state.semester = profile.semester_number;
      showProfile(profile);
      byId("header-name").textContent = profile.full_name;
      byId("header-department").textContent = profile.department;
      byId("avatar-initials").textContent = profile.full_name
        .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
      syncTermSelectors();
      await loadSubjects();
      await Promise.all(["gpa", "sgpa", "cgpa"].map((type) => loadResultHistory(type)));
      if (state.user?.id !== user.id) {
        return;
      }

      renderDashboard();
      state.dashboardReady = true;
    } catch (error) {
      if (state.user?.id === user.id) {
        showToast(error.message);
        console.error(error);
      }
    } finally {
      if (state.dashboardPromise === dashboardPromise) {
        state.dashboardPromise = null;
        state.dashboardPromiseUserId = null;
      }
    }
  })();
  state.dashboardPromise = dashboardPromise;
  return dashboardPromise;
}

function showAuth() {
  state.user = null;
  state.profile = null;
  state.subjects = [];
  state.dashboardReady = false;
  state.dashboardPromise = null;
  state.dashboardPromiseUserId = null;
  state.role = "student";
  byId("admin-students-nav").hidden = true;
  document.querySelectorAll(".nav-item[data-view='subjects'], .nav-item[data-view='profile'], .nav-item[data-view='sgpa'], .nav-item[data-view='cgpa']")
    .forEach((button) => { button.hidden = false; });
  appView.hidden = true;
  authView.hidden = false;
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!state.client) {
    setAuthMessage("Supabase isn't configured yet. Follow the setup steps in web/README.md.");
    return;
  }

  const button = byId("auth-submit");
  button.disabled = true;
  setAuthMessage("");
  try {
    const email = byId("email").value.trim();
    const password = byId("password").value;
    if (password.length < 8) {
      throw new Error("Use a password with at least 8 characters.");
    }

    if (state.authMode === "signup") {
      const fullName = byId("full-name").value.trim();
      const registrationNumber = byId("registration-number").value.trim();
      const department = byId("department").value.trim();
      const academicYear = Number(byId("academic-year").value);
      const semesterNumber = Number(byId("semester-number").value);
      if (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 4) {
        throw new Error("Academic year must be from 1 to 4.");
      }
      if (!fullName || !registrationNumber || !department) {
        throw new Error("Enter your name, registration number, and department to create your profile.");
      }
      if (registrationNumber.length > 50) {
        throw new Error("Registration number must be 50 characters or fewer.");
      }

      const { data, error } = await state.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            registration_number: registrationNumber,
            department,
            academic_year: academicYear,
            semester_number: semesterNumber
          }
        }
      });
      if (error) {
        throw error;
      }
      if (data.session) {
        await showDashboard(data.user);
      } else {
        setAuthMessage("Account created. Check your email to confirm your address, then sign in.", true);
      }
    } else {
      const { data, error } = await state.client.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      const isAdmin = data.user.app_metadata?.role === "admin";
      if ((state.authRoleMode === "admin") !== isAdmin) {
        await state.client.auth.signOut();
        throw new Error(isAdmin
          ? "This is an administrator account. Select Admin to sign in."
          : "This account does not have administrator access.");
      }
      await showDashboard(data.user);
    }
  } catch (error) {
    setAuthMessage(error.message || "Sign-in failed. Please try again.");
  } finally {
    button.disabled = false;
  }
}

async function addSubject(event) {
  event.preventDefault();
  setSubjectMessage("");
  const name = byId("subject-name").value.trim();
  const credits = Number(byId("subject-credits").value);
  const gradePoints = Number(byId("subject-points").value);
  if (!name || name.length > 120) {
    setSubjectMessage("Enter a subject name (up to 120 characters).");
    return;
  }
  if (!Number.isFinite(credits) || credits <= 0 || credits > 1000) {
    setSubjectMessage("Credits must be a number greater than 0 and no more than 1000.");
    return;
  }
  if (!Number.isFinite(gradePoints) || gradePoints < 0 || gradePoints > 1000) {
    setSubjectMessage("Grade points must be a number from 0 to 1000.");
    return;
  }

  const button = byId("add-subject-button");
  button.disabled = true;
  try {
    const { error } = await state.client.from("subjects").insert({
      user_id: state.user.id,
      name,
      credits,
      grade_points: gradePoints,
      academic_year: state.year,
      semester_number: state.semester
    });
    if (error) {
      throw new Error(`Could not save this subject: ${error.message}`);
    }
    byId("subject-form").reset();
    await loadSubjects();
    renderDashboard();
    setSubjectMessage("Subject saved.", false);
  } catch (error) {
    setSubjectMessage(error.message);
  } finally {
    button.disabled = false;
  }
}

async function removeSubject(subject) {
  if (!window.confirm(`Remove "${subject.name}" from this semester?`)) {
    return;
  }
  try {
    const { error } = await state.client
      .from("subjects")
      .delete()
      .eq("id", subject.id)
      .eq("user_id", state.user.id);
    if (error) {
      throw new Error(`Could not remove this subject: ${error.message}`);
    }
    await loadSubjects();
    renderDashboard();
    setSubjectMessage("Subject removed.", false);
  } catch (error) {
    setSubjectMessage(error.message);
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const fullName = byId("profile-full-name").value.trim();
  const department = byId("profile-department").value.trim();
  const academicYear = Number(byId("profile-academic-year").value);
  const semesterNumber = Number(byId("profile-semester-number").value);
  const message = byId("profile-message");
  if (!fullName || !department) {
    message.textContent = "Enter your name and degree or branch.";
    return;
  }
  if (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 4) {
    message.textContent = "Academic year must be from 1 to 4.";
    return;
  }

  const button = byId("save-profile-button");
  button.disabled = true;
  message.textContent = "Saving student details…";
  try {
    const { data, error } = await state.client
      .from("profiles")
      .update({
        full_name: fullName,
        department,
        academic_year: academicYear,
        semester_number: semesterNumber
      })
      .eq("id", state.user.id)
      .select("id, full_name, registration_number, email, department, academic_year, semester_number")
      .single();
    if (error) {
      throw new Error(`Could not save your student details: ${error.message}`);
    }
    state.profile = data;
    state.year = data.academic_year;
    state.semester = data.semester_number;
    showProfile(data);
    byId("header-name").textContent = data.full_name;
    byId("header-department").textContent = data.department;
    byId("avatar-initials").textContent = data.full_name
      .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
    syncTermSelectors();
    await loadSubjects();
    renderDashboard();
    message.textContent = "Student details saved.";
  } catch (error) {
    message.textContent = error.message || "Could not save your student details.";
  } finally {
    button.disabled = false;
  }
}

async function initialize() {
  populateTermSelectors();
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });
  byId("auth-switch").addEventListener("click", () => {
    setAuthMode(state.authMode === "signup" ? "signin" : "signup");
  });
  byId("student-auth-mode").addEventListener("click", () => setAuthRoleMode("student"));
  byId("admin-auth-mode").addEventListener("click", () => setAuthRoleMode("admin"));
  byId("auth-form").addEventListener("submit", handleAuthSubmit);
  byId("subject-form").addEventListener("submit", addSubject);
  byId("profile-form").addEventListener("submit", saveProfile);
  ["gpa", "sgpa", "cgpa"].forEach((type) => {
    byId(`save-${type}-result`).addEventListener("click", () => saveResult(type));
  });
  byId("sign-out").addEventListener("click", async () => {
    try {
      const { error } = await state.client.auth.signOut();
      if (error) {
        throw error;
      }
      showAuth();
      setAuthMode("signin");
    } catch (error) {
      showToast(`Could not sign out: ${error.message || "Please try again."}`);
    }
  });

  try {
    const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
    const config = await response.json();
    if (!response.ok) {
      throw new Error(config.error || "Could not load the app configuration.");
    }
    if (!window.supabase?.createClient) {
      throw new Error("Supabase client library did not load. Check your internet connection and reload.");
    }
    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    state.client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (session?.user) {
          showDashboard(session.user);
        } else {
          showAuth();
        }
      }, 0);
    });

    const { data, error } = await state.client.auth.getSession();
    if (error) {
      throw error;
    }
    if (data.session?.user) {
      await showDashboard(data.session.user);
    }
  } catch (error) {
    setAuthMessage(error.message || "Could not connect to Supabase.");
    console.error(error);
  }
}

setAuthRoleMode(state.authRoleMode);
initialize();

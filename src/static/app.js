document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const roleSelect = document.getElementById("role");
  const roleTitle = document.getElementById("role-title");
  const roleDescription = document.getElementById("role-description");
  const signupHeading = document.getElementById("signup-heading");
  const emailInput = document.getElementById("email");

  const roleCopy = {
    Student: {
      title: "Student dashboard",
      description:
        "Students can enroll themselves and manage only their own activity entries.",
      signupHeading: "Self-service sign up",
    },
    Faculty: {
      title: "Faculty dashboard",
      description:
        "Faculty can enroll students and remove participants when they need to manage activity rosters.",
      signupHeading: "Faculty enrollment tools",
    },
    Administrator: {
      title: "Administrator dashboard",
      description:
        "Administrators can manage all enrollments and oversee the complete activity roster.",
      signupHeading: "Administrator enrollment tools",
    },
  };

  function getCurrentRole() {
    return localStorage.getItem("selectedRole") || "Student";
  }

  function getCurrentEmail() {
    return emailInput.value.trim().toLowerCase();
  }

  function getRequestHeaders() {
    return {
      "X-User-Role": getCurrentRole(),
      "X-User-Email": getCurrentEmail(),
    };
  }

  function updateDashboardCopy() {
    const role = getCurrentRole();
    const copy = roleCopy[role] || roleCopy.Student;

    roleTitle.textContent = copy.title;
    roleDescription.textContent = copy.description;
    signupHeading.textContent = copy.signupHeading;
  }

  function canManageParticipant(email) {
    const role = getCurrentRole();
    if (role === "Administrator" || role === "Faculty") {
      return true;
    }

    return email.toLowerCase() === getCurrentEmail();
  }

  function syncRoleSelection() {
    roleSelect.value = getCurrentRole();
    updateDashboardCopy();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", {
        headers: getRequestHeaders(),
      });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${canManageParticipant(email) ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getRequestHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getRequestHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  roleSelect.addEventListener("change", () => {
    localStorage.setItem("selectedRole", roleSelect.value);
    updateDashboardCopy();
    fetchActivities();
  });

  emailInput.addEventListener("input", () => {
    fetchActivities();
  });

  // Initialize app
  syncRoleSelection();
  fetchActivities();
});

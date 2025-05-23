// popup.js

// Function to be injected - tries both logged-in and logged-out selectors
// *** IMPORTANT: This function should be IDENTICAL to the one in background.js ***
// *** Consider moving this to a shared utility file in a real application to avoid duplication ***
function getProjectDetailsFromPage() {
  // --- Selectors ---
  const loggedInSelectors = {
    title:
      "body > app-root > app-logged-in-shell > div > fl-container > main > div > app-project-view > app-project-view-logged-in > app-project-view-header > div > fl-container:nth-child(1) > fl-grid > fl-col:nth-child(1) > div > app-project-title > fl-heading > h1 > fl-text:nth-child(2) > span",
    description:
      "body > app-root > app-logged-in-shell > div > fl-container > main > div > app-project-view > app-project-view-logged-in > app-project-view-details > fl-page-layout > fl-container > fl-page-layout-single > fl-grid > fl-col:nth-child(1) > fl-card > div > div > app-project-details-description > div > fl-interactive-text > fl-text > span",
    skills:
      "app-project-details-skills div.ProjectViewDetailsSkills fl-tag div.Content",
    skillProcessing: (elements) =>
      Array.from(elements).map((el) => el.textContent.trim()), // No shift needed
  };

  const loggedOutSelectors = {
    title:
      "body > app-root > app-logged-out-shell > div > app-project-view > app-project-view-logged-out > fl-container > fl-container > app-project-view-logged-out-main > div:nth-child(2) > div.Project-heading > div.Project-heading-title > fl-heading:nth-child(1) > h1",
    description:
      "body > app-root > app-logged-out-shell > div > app-project-view > app-project-view-logged-out > fl-container > fl-container > app-project-view-logged-out-main > div:nth-child(2) > fl-text.Project-description > div",
    skills: "fl-tag div.Content", // Selector for skills in logged-out view
    skillProcessing: (elements) => {
      // Shift needed here
      const skills = Array.from(elements).map((el) => el.textContent.trim());
      if (skills.length > 0) skills.shift();
      return skills;
    },
  };

  // --- Extraction Logic ---
  let titleText = "";
  let descriptionText = "";
  let skillsText = "";
  let combinedText = "";
  let errors = [];
  let warnings = [];
  let selectorsUsed = null; // To track which set worked

  // Try Logged-In selectors first
  let titleEl = document.querySelector(loggedInSelectors.title);
  let descEl = document.querySelector(loggedInSelectors.description);
  let skillEls = document.querySelectorAll(loggedInSelectors.skills);

  if (titleEl || descEl || skillEls.length > 0) {
    selectorsUsed = loggedInSelectors;
    console.log("Using Logged-In Selectors");
  } else {
    // If Logged-In failed, try Logged-Out selectors
    titleEl = document.querySelector(loggedOutSelectors.title);
    descEl = document.querySelector(loggedOutSelectors.description);
    skillEls = document.querySelectorAll(loggedOutSelectors.skills);

    if (titleEl || descEl || skillEls.length > 0) {
      selectorsUsed = loggedOutSelectors;
      console.log("Using Logged-Out Selectors");
    } else {
      console.error(
        "Could not find elements using either logged-in or logged-out selectors.",
      );
      errors.push("Relevant page elements not found.");
      return { success: false, error: errors.join("; ") };
    }
  }

  // Extract Title
  if (titleEl) {
    titleText = titleEl.textContent?.trim() || "";
    if (titleText) {
      combinedText += titleText + "\n";
    } else {
      warnings.push("Title element found but empty.");
    }
  } else {
    errors.push("Title element not found (using chosen selectors).");
  }

  // Extract Description
  if (descEl) {
    descriptionText = descEl.textContent?.trim() || "";
    if (descriptionText) {
      combinedText += descriptionText + "\n";
    } else {
      warnings.push("Description element found but empty.");
    }
  } else {
    errors.push("Description element not found (using chosen selectors).");
  }

  // Extract Skills
  if (skillEls.length > 0 && selectorsUsed.skillProcessing) {
    const skills = selectorsUsed.skillProcessing(skillEls);
    if (skills.length > 0) {
      skillsText = "Skills Required:\n" + skills.join(", ");
      combinedText += skillsText + "\n";
    } else {
      warnings.push(
        "Skill elements found but resulted in empty list after processing.",
      );
    }
  } else {
    // Don't push an error if skills simply aren't present, maybe a warning
    warnings.push("Skill elements not found or no processing defined.");
  }

  // --- Return Result ---
  if (errors.length > 0 && !combinedText) {
    return { success: false, error: errors.join("; ") };
  } else if (!combinedText) {
    return { success: false, error: "No content found.", warnings: warnings };
  } else {
    return {
      success: true,
      textToCopy: combinedText.trim(), // Trim final result
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined, // Report non-fatal errors too
    };
  }
}

// --- Popup Script Logic ---

const copyButton = document.getElementById("copyButton"); // Updated ID
const messageDiv = document.getElementById("message");

copyButton.addEventListener("click", async () => {
  messageDiv.textContent = "Extracting...";
  copyButton.disabled = true; // Disable button

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || typeof tab.id === "undefined") {
      throw new Error("Could not identify active tab.");
    }

    // Execute the *combined* script function
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getProjectDetailsFromPage, // Use the combined function
    });

    // Process results (same logic as before, but only one path needed)
    if (chrome.runtime.lastError) {
      console.error(
        "Script injection failed:",
        chrome.runtime.lastError.message,
      );
      messageDiv.textContent = `Injection Error: ${chrome.runtime.lastError.message}`;
    } else if (results && results[0] && results[0].result) {
      const result = results[0].result;

      if (result.warnings)
        console.warn("Content Script Warnings:", result.warnings);
      if (result.errors) console.warn("Content Script Errors:", result.errors);

      if (result.success && result.textToCopy) {
        messageDiv.textContent = "Copying...";
        try {
          await navigator.clipboard.writeText(result.textToCopy);
          messageDiv.textContent = "Details copied!";
          console.log("Copy successful via popup.");
          // setTimeout(() => window.close(), 1500); // Optional close
        } catch (clipboardError) {
          console.error("Popup clipboard write failed:", clipboardError);
          messageDiv.textContent = `Clipboard Error: ${clipboardError.message}`;
        }
      } else {
        messageDiv.textContent = `Extraction Failed: ${result.error || "Unknown reason"}`;
        console.error("Content script extraction error:", result.error);
      }
    } else {
      console.error("Script executed but no valid result received:", results);
      messageDiv.textContent = "Error: Unexpected result from page.";
    }
  } catch (error) {
    console.error("Error in popup script:", error);
    messageDiv.textContent = `Popup Error: ${error.message}`;
  } finally {
    copyButton.disabled = false; // Re-enable button
  }
});

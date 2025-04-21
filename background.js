// Function to be injected - tries both logged-in and logged-out selectors
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

function copyTextToClipboardOnPage(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Clipboard write successful from content script.");
      // You could potentially send a message back to the service worker
      // here if you needed confirmation, but usually not necessary.
    })
    .catch((err) => {
      console.error("Content script clipboard write failed:", err);
      // Handle error - maybe alert the user via other means if needed.
    });
}

// --- Context Menu Setup ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyProjectDetailsContextMenu",
    title: "Copy Project Details",
    contexts: ["page"],
  });
  console.log("Context menu created.");
});

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copyProjectDetailsContextMenu" && tab?.id) {
    const tabId = tab.id; // Store tabId for later use
    console.log("Context menu item clicked for tab:", tabId);

    // 1. First, execute the script to GET the details
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        function: getProjectDetailsFromPage,
      })
      .then(async (results) => {
        // Marked async just in case, though not strictly needed here now
        console.log(
          "executeScript (get details) promise resolved. Checking results:",
          results,
        );
        if (chrome.runtime.lastError) {
          console.error(
            "Script injection (get details) failed:",
            chrome.runtime.lastError.message,
          );
          return;
        }

        if (results && results[0] && results[0].result) {
          const result = results[0].result;
          console.log(
            "Result received from content script:",
            JSON.stringify(result, null, 2),
          );

          if (result.warnings)
            console.warn("Content Script Warnings:", result.warnings);
          if (result.errors)
            console.warn("Content Script Errors:", result.errors);

          if (result.success && result.textToCopy) {
            // --- MODIFIED PART ---
            // 2. If successful, execute ANOTHER script to WRITE to clipboard
            console.log(
              `Attempting to inject copy script with text: "${result.textToCopy}"`,
            );
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: copyTextToClipboardOnPage,
                args: [result.textToCopy], // Pass the text as an argument
              });
              console.log("Clipboard write command sent to content script.");
              // Optional: Notify user success (requires 'notifications' permission)
              // chrome.notifications.create(...);
            } catch (injectionError) {
              console.error(
                "Script injection (copy text) failed:",
                injectionError,
              );
              // Optional: Notify user about injection failure
              // chrome.notifications.create(...);
            }
            // --- END MODIFIED PART ---
          } else {
            console.error(
              "Content script extraction failed or returned no text:",
              result.error || "Unknown reason",
            );
            // Optional: Notify user about extraction failure
            // chrome.notifications.create(...);
          }
        } else {
          console.error(
            "Script execution (get details) returned invalid result structure:",
            results,
          );
          // Optional: Notify user about unexpected result
          // chrome.notifications.create(...);
        }
      })
      .catch((error) => {
        console.error(
          "Error during initial script execution (get details):",
          error,
        );
        // Optional: Notify user about execution error
        // chrome.notifications.create(...);
      });
  }
});

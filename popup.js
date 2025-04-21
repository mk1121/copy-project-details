// Function to be injected into the target page
// *** MODIFIED: Now only extracts text, doesn't write to clipboard ***
function getTextFromPage() {
  // Highly specific selectors - prone to breaking if the website structure changes.
  const titleSelector =
    "body > app-root > app-logged-in-shell > div > fl-container > main > div > app-project-view > app-project-view-logged-in > app-project-view-header > div > fl-container:nth-child(1) > fl-grid > fl-col:nth-child(1) > div > app-project-title > fl-heading > h1 > fl-text:nth-child(2) > span";
  const descriptionSelector =
    "body > app-root > app-logged-in-shell > div > fl-container > main > div > app-project-view > app-project-view-logged-in > app-project-view-details > fl-page-layout > fl-container > fl-page-layout-single > fl-grid > fl-col:nth-child(1) > fl-card > div > div > app-project-details-description > div > fl-interactive-text > fl-text > span";

  const skillSelector =
    "app-project-details-skills div.ProjectViewDetailsSkills fl-tag div.Content";
  const skillElements = document.querySelectorAll(skillSelector);
  const skills = Array.from(skillElements);
  const skillsText = skills.map((skill) => skill.textContent.trim()).join(", ");

  const titleSpan = document.querySelector(titleSelector);
  const descriptionSpan = document.querySelector(descriptionSelector);

  let titleText = "";
  let descriptionText = "";
  let skillsTexts = "Skills Required \n" + skillsText;

  let combinedText = "";
  let errors = [];
  let warnings = [];

  if (titleSpan) {
    titleText = titleSpan.textContent?.trim() || ""; // Use optional chaining and fallback
    if (titleText) {
      combinedText += titleText + "\n";
    } else {
      console.warn("Project title element found but is empty.");
      warnings.push("Title found but empty.");
    }
  } else {
    console.error(
      "Project title element not found with selector:",
      titleSelector,
    );
    errors.push("Title element not found.");
  }

  if (descriptionSpan) {
    descriptionText = descriptionSpan.textContent?.trim() || ""; // Use optional chaining and fallback
    if (descriptionText) {
      combinedText += descriptionText + "\n" + skillsTexts + "\n";
    } else {
      console.warn("Project description element found but is empty.");
      warnings.push("Description found but empty.");
    }
  } else {
    console.error(
      "Project description element not found with selector:",
      descriptionSelector,
    );
    errors.push("Description element not found.");
  }

  // Return based on whether *any* text was found or fatal errors occurred
  if (errors.length > 0 && !combinedText) {
    // If there were errors *and* we got no text at all
    return { success: false, error: errors.join("; ") };
  } else if (!combinedText) {
    // If no errors but also no text (e.g., both fields found but empty)
    return {
      success: false,
      error: "No title or description content found.",
      warnings: warnings,
    };
  } else {
    // If we got some text (even if there were recoverable errors like one field missing)
    return {
      success: true,
      textToCopy: combinedText,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

// Function to be injected into the target page
// *** MODIFIED: Now only extracts text, doesn't write to clipboard ***
function getTextFromIncogPage() {
  function extractSkillsSkipFirst_Shift() {
    // CSS selector remains the same
    const skillSelector = "fl-tag div.Content";

    // Find all matching elements
    const skillElements = document.querySelectorAll(skillSelector);

    // Extract text content for all skills
    const skills = Array.from(skillElements).map((element) => {
      return element.textContent.trim(); // Get text and remove extra whitespace
    });

    // Remove the first element from the array if it's not empty
    if (skills.length > 0) {
      skills.shift(); // Removes the element at index 0
    }

    // Return the modified array
    return skills;
  }

  // Highly specific selectors - prone to breaking if the website structure changes.
  const titleSelector =
    "body > app-root > app-logged-out-shell > div > app-project-view > app-project-view-logged-out > fl-container > fl-container > app-project-view-logged-out-main > div:nth-child(2) > div.Project-heading > div.Project-heading-title > fl-heading:nth-child(1) > h1";
  const descriptionSelector =
    "body > app-root > app-logged-out-shell > div > app-project-view > app-project-view-logged-out > fl-container > fl-container > app-project-view-logged-out-main > div:nth-child(2) > fl-text.Project-description > div";

  const titleSpan = document.querySelector(titleSelector);
  const descriptionSpan = document.querySelector(descriptionSelector);

  let titleText = "";
  let descriptionText = "";
  let skillsText = extractSkillsSkipFirst_Shift().join(", ");
  let combinedText = "";
  let errors = [];
  let warnings = [];

  if (titleSpan) {
    titleText = titleSpan.textContent?.trim() || ""; // Use optional chaining and fallback
    if (titleText) {
      combinedText += titleText + "\n";
    } else {
      console.warn("Project title element found but is empty.");
      warnings.push("Title found but empty.");
    }
  } else {
    console.error(
      "Project title element not found with selector:",
      titleSelector,
    );
    errors.push("Title element not found.");
  }

  if (descriptionSpan) {
    descriptionText = descriptionSpan.textContent?.trim() || ""; // Use optional chaining and fallback
    if (descriptionText) {
      combinedText +=
        descriptionText + "\n" + "Skills Required\n" + skillsText + "\n";
    } else {
      console.warn("Project description element found but is empty.");
      warnings.push("Description found but empty.");
    }
  } else {
    console.error(
      "Project description element not found with selector:",
      descriptionSelector,
    );
    errors.push("Description element not found.");
  }

  // Return based on whether *any* text was found or fatal errors occurred
  if (errors.length > 0 && !combinedText) {
    // If there were errors *and* we got no text at all
    return { success: false, error: errors.join("; ") };
  } else if (!combinedText) {
    // If no errors but also no text (e.g., both fields found but empty)
    return {
      success: false,
      error: "No title or description content found.",
      warnings: warnings,
    };
  } else {
    // If we got some text (even if there were recoverable errors like one field missing)
    return {
      success: true,
      textToCopy: combinedText,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
// --- Popup Script Logic ---

// Get references to popup elements
const copyButton = document.getElementById("copyButton");
const copyIncogButton = document.getElementById("copyIncogButton");
const messageDiv = document.getElementById("message");

// Add click listener to the button in the popup

copyIncogButton.addEventListener("click", async () => {
  messageDiv.textContent = "Extracting..."; // Update feedback
  copyButton.disabled = true; // Disable button during operation

  try {
    // 1. Get the current active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || typeof tab.id === "undefined") {
      throw new Error("Could not identify active tab.");
    }

    // 2. Execute the content script function to GET the text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getTextFromIncogPage, // Inject the text extraction function
    });

    // 3. Process the result returned from the content script
    if (chrome.runtime.lastError) {
      console.error(
        "Script injection failed:",
        chrome.runtime.lastError.message,
      );
      messageDiv.textContent = `Injection Error: ${chrome.runtime.lastError.message}`;
    } else if (results && results[0] && results[0].result) {
      const result = results[0].result;

      // Log any warnings/errors from content script regardless of success
      if (result.warnings) {
        console.warn("Content Script Warnings:", result.warnings);
      }
      if (result.errors) {
        console.warn(
          "Content Script Errors (but text might still be copied):",
          result.errors,
        );
      }

      if (result.success && result.textToCopy) {
        // *** 4. Copy the text FROM THE POPUP SCRIPT ***
        messageDiv.textContent = "Copying...";
        try {
          await navigator.clipboard.writeText(result.textToCopy);
          messageDiv.textContent = "Details copied!";
          console.log("Copy successful.");
          // Optional: Close popup after success
          // setTimeout(() => window.close(), 1500);
        } catch (clipboardError) {
          console.error("Popup clipboard write failed:", clipboardError);
          messageDiv.textContent = `Clipboard Error: ${clipboardError.message}`;
        }
      } else {
        // Extraction failed in the content script
        messageDiv.textContent = `Extraction Failed: ${result.error || "Unknown reason"}`;
        console.error("Content script extraction error:", result.error);
      }
    } else {
      console.error("Script executed but no valid result received:", results);
      messageDiv.textContent = "Error: Unexpected result from page.";
    }
  } catch (error) {
    // Catch errors from chrome.tabs.query or other async operations in the popup
    console.error("Error in popup script:", error);
    messageDiv.textContent = `Popup Error: ${error.message}`;
  } finally {
    copyButton.disabled = false; // Re-enable button
  }
});

copyButton.addEventListener("click", async () => {
  messageDiv.textContent = "Extracting..."; // Update feedback
  copyButton.disabled = true; // Disable button during operation

  try {
    // 1. Get the current active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || typeof tab.id === "undefined") {
      throw new Error("Could not identify active tab.");
    }

    // 2. Execute the content script function to GET the text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getTextFromPage, // Inject the text extraction function
    });

    // 3. Process the result returned from the content script
    if (chrome.runtime.lastError) {
      console.error(
        "Script injection failed:",
        chrome.runtime.lastError.message,
      );
      messageDiv.textContent = `Injection Error: ${chrome.runtime.lastError.message}`;
    } else if (results && results[0] && results[0].result) {
      const result = results[0].result;

      // Log any warnings/errors from content script regardless of success
      if (result.warnings) {
        console.warn("Content Script Warnings:", result.warnings);
      }
      if (result.errors) {
        console.warn(
          "Content Script Errors (but text might still be copied):",
          result.errors,
        );
      }

      if (result.success && result.textToCopy) {
        // *** 4. Copy the text FROM THE POPUP SCRIPT ***
        messageDiv.textContent = "Copying...";
        try {
          await navigator.clipboard.writeText(result.textToCopy);
          messageDiv.textContent = "Details copied!";
          console.log("Copy successful.");
          // Optional: Close popup after success
          // setTimeout(() => window.close(), 1500);
        } catch (clipboardError) {
          console.error("Popup clipboard write failed:", clipboardError);
          messageDiv.textContent = `Clipboard Error: ${clipboardError.message}`;
        }
      } else {
        // Extraction failed in the content script
        messageDiv.textContent = `Extraction Failed: ${result.error || "Unknown reason"}`;
        console.error("Content script extraction error:", result.error);
      }
    } else {
      console.error("Script executed but no valid result received:", results);
      messageDiv.textContent = "Error: Unexpected result from page.";
    }
  } catch (error) {
    // Catch errors from chrome.tabs.query or other async operations in the popup
    console.error("Error in popup script:", error);
    messageDiv.textContent = `Popup Error: ${error.message}`;
  } finally {
    copyButton.disabled = false; // Re-enable button
  }
});

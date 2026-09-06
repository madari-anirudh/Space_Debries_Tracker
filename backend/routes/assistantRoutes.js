const express = require("express");

const {
  processAssistantMessage,
} = require("../services/assistantService");

const router = express.Router();

/*
=========================================================
POST /api/assistant
=========================================================
*/

router.post("/", async (req, res) => {
  const startedAt = Date.now();

  try {
    console.log(
      "\n================================================="
    );

    console.log(
      "ORBITAL AI ASSISTANT REQUEST"
    );

    console.log(
      "================================================="
    );

    console.log(
      "Body:",
      req.body
    );

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "message is required",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error:
          "message is too long. Maximum length is 2000 characters.",
      });
    }

    console.log(
      "User message:",
      message
    );

    const result =
      await processAssistantMessage(message);

    console.log(
      "Assistant intent:",
      result?.intent
    );

    console.log(
      "Assistant completed in:",
      `${Date.now() - startedAt} ms`
    );

    return res.json(result);
  } catch (error) {
    console.error(
      "\n================================================="
    );

    console.error(
      "ORBITAL AI ASSISTANT ERROR"
    );

    console.error(
      "================================================="
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Code:",
      error.code
    );

    console.error(
      "Response status:",
      error.response?.status
    );

    console.error(
      "Response data:",
      error.response?.data
    );

    console.error(
      "Stack:",
      error.stack
    );

    console.error(
      "=================================================\n"
    );

    return res.status(500).json({
      success: false,

      error:
        "Orbital AI could not process the request.",

      details:
        error.message,

      code:
        error.code || null,

      upstream:
        error.response?.data || null,
    });
  }
});

module.exports = router;
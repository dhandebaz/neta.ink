import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";

/**
 * Create an assessment to analyze the risk of a UI action.
 *
 * @param token The generated token obtained from the client.
 * @param recaptchaAction Action name corresponding to the token.
 * @param projectID Your Google Cloud Project ID.
 * @param recaptchaKey The reCAPTCHA key associated with the site/app.
 */
export async function createAssessment({
  token,
  recaptchaAction,
  projectID = process.env.RECAPTCHA_PROJECT_ID || "nodebase-c3b51",
  recaptchaKey = process.env.RECAPTCHA_SITE_KEY || "6LfarHUsAAAAAGlu9km2A3rG_IuLI9FLLox4c9u_"
}: {
  token: string;
  recaptchaAction: string;
  projectID?: string;
  recaptchaKey?: string;
}) {
  // Create the reCAPTCHA client.
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(projectID);

  // Build the assessment request.
  const request = {
    assessment: {
      event: {
        token: token,
        siteKey: recaptchaKey
      }
    },
    parent: projectPath
  };

  const [response] = await client.createAssessment(request);

  // Check if the token is valid.
  if (!response.tokenProperties?.valid) {
    console.error(
      `The CreateAssessment call failed because the token was: ${response.tokenProperties?.invalidReason}`
    );
    return null;
  }

  // Check if the expected action was executed.
  if (response.tokenProperties.action === recaptchaAction) {
    // Get the risk score and the reason(s).
    console.log(`The reCAPTCHA score is: ${response.riskAnalysis?.score}`);
    response.riskAnalysis?.reasons?.forEach((reason) => {
      console.log(reason);
    });

    return {
      score: response.riskAnalysis?.score ?? 0,
      reasons: response.riskAnalysis?.reasons ?? []
    };
  } else {
    console.warn(
      "The action attribute in your reCAPTCHA tag does not match the action you are expecting to score"
    );
    return null;
  }
}

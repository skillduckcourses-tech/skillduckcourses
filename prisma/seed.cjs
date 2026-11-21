/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const coursePricePkr = 999;
const groups = {
  MICROSOFT: ["Microsoft Free Fundamentals & Productivity", ["Azure Fundamentals", "AI Fundamentals", "Security Fundamentals", "Power Platform Fundamentals", "Microsoft 365 Fundamentals", "Word Productivity", "Excel Business Analytics", "PowerPoint Design", "Power BI Visualization", "Power BI Financial Reporting", "Azure Data Fundamentals", "Azure Developer Essentials", "Azure Administrator Essentials", "Microsoft Teams Collaboration", "Microsoft Intune Endpoint Management"]],
  AMAZON_ECOMMERCE: ["Amazon E-Commerce & FBA Mastery", ["Amazon FBA Product Research", "Amazon Private Label Launch", "Amazon Wholesale Mastery", "Amazon Retail Arbitrage", "Amazon Listing Optimization", "Amazon PPC Advertising", "Amazon Brand Registry", "Amazon Seller Growth", "Amazon FBA Operations", "Amazon International Selling", "Amazon KDP Publishing", "Amazon Handmade Business"]],
  AI_ML: ["Artificial Intelligence & Machine Learning Engineering", ["Artificial Intelligence Foundations", "Machine Learning Engineering", "Python for AI", "Deep Learning", "Generative AI Applications", "Prompt Engineering", "Natural Language Processing", "Computer Vision", "MLOps Deployment", "AI Product Management", "Responsible AI", "Data Science with Python"]],
  DIGITAL_MARKETING_SHOPIFY: ["Digital Marketing & Shopify Growth", ["Shopify Store Operations", "Shopify Theme Development", "Shopify Conversion Optimization", "Digital Marketing Strategy", "Search Engine Optimization", "Social Media Marketing", "Content Marketing", "Email Marketing Automation", "TikTok Shop Execution", "Freelancing Masterclass", "Google Ads Management", "The Elite Grow Business Growth", "WhatsApp Commerce Growth"]],
  MEDICAL_HEALTH: ["Medical, Healthcare & Nutrition", ["Environment Health and Safety Management", "Nutrition & Dietetics Advisor", "First Aid & Safety", "Healthcare Assistant Essentials", "Public Health & Community Wellness", "Medical Coding Foundations", "Patient Care Coordination", "Clinical Research Operations"]],
  GYM_FITNESS: ["Gym & Physical Fitness", ["Fitness & Wellness Coaching", "Personal Training Foundations", "Sports Nutrition Advisor", "Strength and Conditioning", "Yoga and Mobility Coaching", "Gym Business Operations"]],
};
const questionBanks = {
  MICROSOFT: [
    ["A tenant administrator must apply least privilege to a new analyst. Which control is most appropriate?", ["Assign a scoped role at the resource-group level", "Share the global administrator password", "Disable audit logging", "Grant unrestricted owner access"], 0],
    ["A finance team needs a refreshable model that combines worksheets and SQL data. Which design is strongest?", ["Use a governed semantic model with scheduled refresh", "Export screenshots into a slide deck", "Store every value in a text file", "Copy rows manually each morning"], 0],
    ["An organization wants to recover from accidental blob deletion. Which configuration addresses the requirement?", ["Enable soft delete and versioning", "Disable storage redundancy", "Remove retention policies", "Use a public anonymous container"], 0],
    ["A support team must investigate sign-in anomalies. Which evidence should be reviewed first?", ["Identity sign-in and audit logs", "Presentation themes", "Desktop wallpaper settings", "Unused mailbox drafts"], 0],
    ["A cloud workload has unpredictable demand. Which approach best controls cost and capacity?", ["Use autoscaling with budgets and alerts", "Provision the largest tier permanently", "Turn off monitoring", "Duplicate every workload manually"], 0],
    ["A department is standardizing collaboration spaces. Which practice reduces information sprawl?", ["Define naming, ownership, retention, and access policies", "Allow every user to create unrestricted teams", "Publish private files anonymously", "Remove owners after creation"], 0],
    ["A data model contains repeated customer attributes. Which modeling decision improves analytical reliability?", ["Separate dimensions from measurable facts", "Mix all fields into one untyped column", "Delete historical keys", "Use presentation formatting as a key"], 0],
    ["A device fleet must meet a compliance baseline before accessing company data. Which pattern fits?", ["Evaluate device posture through conditional access", "Trust every device on the network", "Disable endpoint inventory", "Rely on an emailed declaration"], 0],
    ["An application requires secrets without exposing them in source control. Where should they live?", ["A managed secret store with identity-based access", "A public repository README", "A client-side JavaScript constant", "A shared spreadsheet"], 0],
    ["A manager wants a reliable KPI definition used by multiple reports. What should the team create?", ["A certified metric in a governed semantic layer", "Separate handwritten formulas in each report", "A screenshot of last month's value", "A label with no calculation"], 0],
  ],
  AMAZON_ECOMMERCE: [
    ["A seller is evaluating a product before ordering stock. Which evidence is most decision-useful?", ["Demand, contribution margin, competition, and landed cost", "Only the product color", "A competitor's logo", "The cheapest supplier quote alone"], 0],
    ["An FBA listing receives traffic but few purchases. Which first diagnostic is most appropriate?", ["Compare search intent, offer, detail page, and conversion data", "Increase inventory immediately", "Delete all reviews", "Change the brand name daily"], 0],
    ["A seller's advertising spend is rising while contribution margin falls. Which action is disciplined?", ["Reallocate bids using profitable search-term performance", "Raise every bid equally", "Pause organic listing work", "Hide the selling price"], 0],
    ["A private-label launch needs defensible positioning. What should the research establish?", ["A validated customer problem and differentiated value proposition", "A copied competitor title", "A random package color", "The longest possible product name"], 0],
    ["Inventory is frequently stranded because inbound quantities exceed demand. Which control helps?", ["Use demand forecasts, reorder points, and aged-inventory reviews", "Order based on intuition only", "Remove SKU-level reporting", "Ship without a receiving plan"], 0],
    ["A listing is accused of making an unsupported health claim. What is the correct response?", ["Remove the claim and verify compliant evidence before republishing", "Add stronger medical promises", "Ask customers to edit the listing", "Move the claim into the image"], 0],
    ["A wholesale buyer compares two suppliers. Which calculation should govern the decision?", ["Net margin after fees, freight, prep, returns, and expected sell-through", "Unit price without logistics", "Supplier follower count", "The supplier's favorite color"], 0],
    ["A seller wants to protect a registered brand. Which operational step is relevant?", ["Maintain trademark records and use brand protection tools", "Share the master login", "Remove product identifiers", "Publish duplicate detail pages"], 0],
    ["A product receives negative reviews about packaging damage. Which response is most useful?", ["Analyze defect patterns and test a packaging change", "Delete all customer feedback", "Increase ad bids", "Stop measuring returns"], 0],
    ["A cross-border seller enters a new marketplace. What should be checked before launch?", ["Tax, labeling, restricted-product, logistics, and local demand requirements", "Only the marketplace logo", "A single social post", "Whether the product title is longest"], 0],
  ],
  AI_ML: [
    ["A classifier performs well in training but poorly on unseen samples. Which diagnosis is most likely?", ["Overfitting caused by excessive variance", "A perfect generalization result", "A missing user interface", "A larger monitor requirement"], 0],
    ["A dataset contains a protected attribute correlated with the label. What should precede deployment?", ["Audit representation, outcomes, and mitigation options", "Remove all evaluation data", "Hide the attribute from reviewers", "Optimize only overall accuracy"], 0],
    ["A model serves predictions in production. Which practice makes drift observable?", ["Monitor input distributions, outcomes, latency, and quality", "Train once and never inspect results", "Delete prediction logs", "Measure only CPU color"], 0],
    ["A team is choosing a validation strategy for time-dependent forecasting. Which split is valid?", ["Train on earlier periods and validate on later periods", "Randomly mix future observations into training", "Validate on the labels used for training", "Use no holdout data"], 0],
    ["A language model produces confident unsupported statements. Which control helps reduce this risk?", ["Ground responses in retrieved evidence and evaluate citations", "Increase temperature without testing", "Remove source documents", "Treat confidence as proof"], 0],
    ["A feature is unavailable at prediction time but present in historical training rows. What problem does it cause?", ["Target leakage and inflated offline performance", "Improved causal validity", "Lower storage cost", "A guaranteed production win"], 0],
    ["A vision model must recognize rare defects. Which evaluation view is important?", ["Per-class recall, precision, and a confusion matrix", "Accuracy alone on the majority class", "Training filename length", "The dashboard font"], 0],
    ["An ML service needs reproducible releases. Which artifact set is essential?", ["Versioned data references, code, model, configuration, and metrics", "Only a screenshot", "An untracked notebook", "A verbal handoff"], 0],
    ["A prompt-based system handles sensitive records. Which design is safest?", ["Minimize data, enforce access controls, and redact unnecessary fields", "Send all records to every provider", "Log raw secrets in prompts", "Disable retention review"], 0],
    ["A regression model has a large error on one important segment. What should happen next?", ["Investigate segment data quality and report stratified metrics", "Hide the segment", "Average it away", "Deploy without review"], 0],
  ],
  DIGITAL_MARKETING_SHOPIFY: [
    ["A Shopify store has high add-to-cart activity but low checkout completion. Which analysis is most useful?", ["Inspect checkout friction, shipping cost, trust, and payment failures", "Increase the logo size", "Delete product reviews", "Post more unrelated content"], 0],
    ["A campaign needs reliable channel comparison. Which setup is essential?", ["Consistent UTM taxonomy and conversion attribution rules", "A different landing page every hour", "Unlabeled links", "Counting impressions as purchases"], 0],
    ["A content team wants sustainable search growth. Which practice is strongest?", ["Map useful content to search intent and demonstrate first-hand expertise", "Repeat one keyword unnaturally", "Hide text from users", "Buy irrelevant backlinks"], 0],
    ["An email campaign has strong opens but weak revenue. What should be tested?", ["Offer relevance, segmentation, message, and landing-page continuity", "Send to every address daily", "Remove unsubscribe controls", "Change the sender randomly"], 0],
    ["A creator is launching a TikTok Shop product. Which evidence supports iteration?", ["Hook retention, product clicks, add-to-cart, and assisted sales", "Follower count alone", "Video length without outcomes", "The number of emojis"], 0],
    ["A freelancer is defining a project scope. Which artifact prevents avoidable disputes?", ["A written brief with deliverables, assumptions, milestones, and acceptance criteria", "A vague voice note", "An unlimited revision promise", "A copied proposal"], 0],
    ["A brand sees rising paid clicks but flat profit. What should guide optimization?", ["Incremental contribution margin by audience and campaign", "Click volume alone", "The highest possible CPC", "Removing product costs"], 0],
    ["A Shopify merchant wants to improve product discovery. Which information architecture helps?", ["Clear collections, filters, descriptive metadata, and internal links", "One page containing every product", "Hidden navigation", "Random collection names"], 0],
    ["A retention program is being designed. Which cohort view is most revealing?", ["Repeat purchase and revenue behavior by acquisition period", "Total followers", "One day's orders", "Homepage color preference"], 0],
    ["A marketing claim needs credibility. What should the team publish?", ["Specific substantiated outcomes with clear limits and evidence", "Guaranteed results for everyone", "Anonymous numbers", "Unverifiable testimonials"], 0],
  ],
  MEDICAL_HEALTH: [
    ["A nutrition advisor is assessing a new client. Which step should come before a restrictive plan?", ["Collect history, goals, dietary pattern, risks, and refer when appropriate", "Prescribe supplements immediately", "Ignore medications", "Use one plan for every client"], 0],
    ["A clinic wants to reduce medication errors. Which intervention is strongest?", ["Use reconciliation, standardized handoffs, and independent checks", "Rely on memory", "Remove documentation", "Allow verbal changes without confirmation"], 0],
    ["A community health team plans an intervention. Which measure best tests impact?", ["A defined outcome with baseline, target, timeframe, and population", "The number of posters printed", "Staff preference", "Anecdotes only"], 0],
    ["A first-aid responder finds an unresponsive adult. What is the priority sequence?", ["Ensure safety, assess responsiveness/breathing, activate help, and begin appropriate care", "Offer food first", "Move the person without assessment", "Wait for social media advice"], 0],
    ["A safety officer reviews a workplace exposure. Which control is preferred in the hierarchy?", ["Eliminate or substitute the hazard before relying on PPE", "Use PPE as the only control", "Ignore the source", "Ask workers to accept the risk"], 0],
    ["A clinical note must support continuity of care. What should it contain?", ["Accurate findings, assessment, plan, response, and relevant time context", "Speculation without labels", "Copied historical text only", "A blank problem list"], 0],
    ["A researcher obtains consent for a study. Which principle is required?", ["Explain purpose, risks, benefits, alternatives, and voluntary withdrawal", "Promise guaranteed benefit", "Hide foreseeable risks", "Collect consent after intervention"], 0],
    ["A patient reports a new symptom outside a coach's scope. What is appropriate?", ["Document and refer to a qualified clinician", "Diagnose from a checklist", "Sell a guaranteed cure", "Discourage medical care"], 0],
    ["A public-health team sees low vaccination uptake. Which first step is evidence-based?", ["Explore access barriers, trust, communication, and local data", "Blame the population", "Increase jargon", "Stop measuring uptake"], 0],
    ["A facility reviews an incident. Which approach supports learning?", ["Use a structured root-cause review focused on systems and prevention", "Assign blame before collecting facts", "Delete the report", "Treat recurrence as unavoidable"], 0],
  ],
  GYM_FITNESS: [
    ["A trainer begins work with a new client. Which assessment principle is sound?", ["Screen goals, history, readiness, movement, and referral needs", "Start maximal testing immediately", "Ignore pain reports", "Use the same load for everyone"], 0],
    ["A strength plan must progress safely. Which variable can be manipulated?", ["Load, volume, intensity, frequency, range, or rest with recovery monitored", "Only exercise color", "No variables", "Pain tolerance alone"], 0],
    ["A client reports sharp pain during a movement. What should the coach do?", ["Stop or modify the movement and refer when symptoms require it", "Push through sharp pain", "Hide the symptom", "Add maximal load"], 0],
    ["An athlete is preparing for a power phase. Which quality should be prioritized?", ["High intent, appropriate load, full recovery, and technical consistency", "Exhaustion on every set", "No rest between maximal efforts", "Random exercise changes"], 0],
    ["A nutrition coach is estimating a client's needs. Which approach is responsible?", ["Use goals, training load, preferences, context, and monitor response", "Promise an identical result", "Ignore medical history", "Remove all food groups by default"], 0],
    ["A gym wants to retain members. Which metric is most actionable?", ["Attendance, engagement, retention cohorts, and member feedback together", "The number of mirrors", "One social impression", "Music volume"], 0],
    ["A mobility session is planned for a restricted joint. What should guide dosage?", ["Comfortable range, control, breathing, and progressive response", "Forced end-range pain", "Bouncing aggressively", "Ignoring asymmetry"], 0],
    ["A client is returning after illness. Which progression is safest?", ["Obtain appropriate clearance and rebuild volume gradually", "Resume previous maximums immediately", "Train through systemic symptoms", "Skip monitoring"], 0],
    ["A coach evaluates program success. Which evidence is strongest?", ["Performance, adherence, recovery, symptoms, and goal-specific outcomes", "A single workout feeling", "A generic scale only", "The coach's favorite exercise"], 0],
    ["A facility writes an emergency plan. Which element is essential?", ["Roles, communication, equipment, escalation, and rehearsed procedures", "A decorative poster only", "No contact list", "Unassigned responsibility"], 0],
  ],
};
const courseSpecificBanks = {
  NUTRITION: [
    ["A client with unexplained fatigue is beginning a nutrition assessment. Which information should be prioritized before recommending dietary change?", ["Dietary history, symptoms, medications, measurements, and referral risk", "A fixed calorie target selected without assessment", "A supplement stack copied from a social post", "A restriction plan based only on body weight"], 0],
    ["A dietitian is evaluating a client's iron status. Which interpretation is most clinically defensible?", ["Interpret biomarkers with symptoms, history, inflammation, and the full clinical context", "Diagnose deficiency from one isolated value", "Ignore menstrual or gastrointestinal history", "Recommend high-dose iron before reviewing the record"], 0],
    ["A meal plan must support glycemic control while remaining practical. Which design principle is strongest?", ["Match carbohydrate quality and distribution to preferences, medication, activity, and monitoring", "Remove all carbohydrate for every client", "Use the same menu regardless of schedule", "Measure success only by one day's glucose reading"], 0],
    ["A client asks whether an herbal product is safe with prescribed medication. What should the nutrition professional do?", ["Check reliable interaction information and coordinate with the prescribing clinician", "Assume natural products cannot interact", "Recommend doubling the dose", "Tell the client to stop prescribed treatment"], 0],
    ["A nutrition intervention is being evaluated in a community program. Which outcome makes the evaluation actionable?", ["A defined nutrition behavior, baseline, target, timeframe, and measurement method", "The number of brochures printed", "Staff enthusiasm at launch", "Anecdotal success without a comparison"], 0],
    ["A patient has difficulty maintaining a prescribed eating pattern. Which counseling response best supports adherence?", ["Explore barriers and co-create a measurable change that fits the patient's context", "Increase restrictions immediately", "Treat missed goals as noncompliance", "Replace counseling with a generic handout"], 0],
    ["A food-service team is managing a suspected allergen risk. Which control is most reliable?", ["Separate workflows, verify labels, train staff, and prevent cross-contact", "Rely on memory during busy service", "Remove the allergen label", "Ask customers to identify every ingredient themselves"], 0],
    ["A researcher is planning a nutrition study. Which feature most improves interpretability?", ["A prespecified protocol with appropriate comparison, outcomes, and confounder handling", "Changing the primary outcome after seeing results", "Recruiting only convenient participants without documenting selection", "Reporting only favorable measurements"], 0],
    ["An older adult has unintentional weight loss. Which first response is most appropriate?", ["Screen for medical, functional, social, medication, and access-related causes", "Prescribe a high-calorie product without assessment", "Assume appetite is the only cause", "Dismiss the change as normal aging"], 0],
    ["A nutrition label is being reviewed for a patient with hypertension. Which comparison is useful?", ["Serving size, sodium density, total intake, and the patient's overall dietary pattern", "The front-of-pack claim alone", "Package color", "Calories without serving context"], 0],
  ],
  COMPUTER_SCIENCE: [
    ["A service must process millions of records while keeping lookup latency predictable. Which design is most appropriate?", ["Choose an indexed data structure and analyze its time and space complexity", "Scan every record for every request", "Store all values in an unstructured log", "Optimize only the user interface"], 0],
    ["Two concurrent workers update the same inventory quantity. Which mechanism prevents a lost update?", ["Use a transaction with an appropriate isolation or concurrency-control strategy", "Allow both writes without coordination", "Retry indefinitely without detecting conflicts", "Cache the quantity only in the browser"], 0],
    ["A compiler reports a type error before execution. What property does this check provide?", ["It detects a class of invalid programs during a defined analysis phase", "It proves the program has no runtime failures", "It replaces all testing", "It guarantees optimal performance"], 0],
    ["A networked application must tolerate a dropped connection. Which behavior is resilient?", ["Use bounded retries, idempotent operations, timeouts, and an explicit failure state", "Retry forever with no backoff", "Assume the network is always reliable", "Duplicate every request without an identifier"], 0],
    ["A team is decomposing a software system. Which boundary is most maintainable?", ["A cohesive responsibility with an explicit contract and limited coupling", "A module that owns unrelated global state", "A shared mutable object used by every feature", "A boundary defined only by file size"], 0],
    ["A database query becomes slow after a table grows. Which investigation should come first?", ["Inspect the query plan, data distribution, indexes, and actual workload", "Add random indexes without measurement", "Copy the table into a spreadsheet", "Increase client-side font size"], 0],
    ["A security review finds user input reaching a database query. Which remediation is strongest?", ["Use parameterized queries, validation, least privilege, and tested negative cases", "Escape only one character", "Trust values from the browser", "Log the input and execute it unchanged"], 0],
    ["A distributed job must be safe to repeat after a timeout. Which property matters?", ["Idempotence or a durable operation key that prevents duplicate effects", "A longer button label", "Removing all status records", "Assuming the first attempt completed"], 0],
    ["A test suite passes locally but fails intermittently in CI. Which next step is disciplined?", ["Capture timing, ordering, environment, and shared-state evidence before changing assertions", "Delete the flaky test", "Add arbitrary sleeps everywhere", "Ignore the failure because it is nondeterministic"], 0],
    ["A system must expose a public API to multiple clients. Which contract practice reduces breakage?", ["Version explicit schemas and define compatibility, errors, and authentication behavior", "Return a different shape for each caller", "Expose database tables directly", "Change fields without communication"], 0],
  ],
};

function getQuestionBank(title, category) {
  const normalizedTitle = title.toLowerCase();
  if (/nutrition|diet|food science/.test(normalizedTitle)) return courseSpecificBanks.NUTRITION;
  if (/computer science|programming|software|coding|developer/.test(normalizedTitle)) return courseSpecificBanks.COMPUTER_SCIENCE;
  return questionBanks[category];
}

const examVariants = [
  "Use the evidence available at the point of decision.",
  "Prioritize the action that protects quality and professional accountability.",
  "Select the response that remains defensible when outcomes are reviewed.",
  "Apply the principle to a real workplace or client situation.",
  "Choose the intervention that addresses the underlying cause.",
  "Consider safety, measurement, and downstream effects together.",
  "Identify the approach that supports repeatable practice.",
  "Reason from the stated constraints rather than an assumed shortcut.",
  "Choose the option that can be monitored and improved over time.",
  "Select the decision that preserves valid evidence and appropriate scope.",
  "Account for context, trade-offs, and the people affected.",
  "Prefer the control that prevents the failure before it occurs.",
];

async function main() {
  const total = Object.values(groups).reduce((count, [, titles]) => count + titles.length, 0);
  if (total !== 66) throw new Error(`Expected 66 courses, found ${total}`);
  await prisma.certificate.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.exam.deleteMany();
  let rank = 0;
  for (const [category, [label, titles]] of Object.entries(groups)) {
    for (const [index, title] of titles.entries()) {
      rank += 1;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const isTrending = rank <= 12;
      const course = await prisma.course.upsert({ where: { slug }, update: { title, category, price: coursePricePkr, isPublished: true, isTrending, ranking: rank }, create: { slug, title, category, price: coursePricePkr, isPublished: true, isTrending, ranking: rank, description: `Professional certificate pathway: ${title}.` } });
      const exam = await prisma.exam.upsert({ where: { courseId_title: { courseId: course.id, title: `${title} Assessment` } }, update: { description: `${label} assessment`, durationMin: 23, passingScore: 70, isPublished: true }, create: { courseId: course.id, title: `${title} Assessment`, description: `${label} assessment`, durationMin: 23, passingScore: 70, isPublished: true } });
      await prisma.question.deleteMany({ where: { examId: exam.id } });
      const bank = getQuestionBank(title, category);
      const questionRows = Array.from({ length: 30 }, (_, index) => {
        const item = bank[index % bank.length];
        const variant = examVariants[Math.floor(index / bank.length)];
        const courseContext = `${title} (${category})`;
        const text = `${courseContext} | Question ${index + 1}: ${item[0]} ${variant}`;
        const options = item[1].map((option, optionIndex) => optionIndex === item[2] ? option : `${option} [${courseContext} scenario ${index + 1}]`);
        return { examId: exam.id, text, options, correctAnswer: item[1][item[2]], points: 1 };
      });
      const texts = questionRows.map((question) => question.text);
      const optionSets = questionRows.map((question) => JSON.stringify([...question.options].sort()));
      if (new Set(texts).size !== questionRows.length || new Set(optionSets).size !== questionRows.length) throw new Error(`Duplicate question content generated for ${title}`);
      await prisma.question.createMany({ data: questionRows });
      await prisma.youTubeVideo.upsert({ where: { videoId: `skd${category.slice(0, 2).toLowerCase()}${String(index).padStart(6, "0")}` }, update: { courseId: course.id, title: `${title} course briefing`, durationSeconds: 600, isPublished: true }, create: { courseId: course.id, videoId: `skd${category.slice(0, 2).toLowerCase()}${String(index).padStart(6, "0")}`, title: `${title} course briefing`, durationSeconds: 600, isPublished: true } });
    }
  }
  await prisma.course.updateMany({ data: { price: coursePricePkr } });
  console.log(`Seeded ${total} courses with ${total * 30} unique course-matched questions.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
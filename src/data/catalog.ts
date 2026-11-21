export type CourseCategory =
  | "Medical, Health & Nutrition"
  | "Computer Science, Google & Microsoft Tech"
  | "E-Commerce & Digital Business"
  | "Cybersecurity & Networking"
  | "Medical & Healthcare"
  | "Gym & Physical Fitness";

export type CatalogCourse = { id: string; title: string; category: CourseCategory; description: string };

export const catalog: CatalogCourse[] = [
  { id: "ehs-management", title: "Environment Health and Safety Management", category: "Medical, Health & Nutrition", description: "Build safer workplaces with practical health and safety systems." },
  { id: "nutrition-dietetics", title: "Nutrition & Dietetics Advisor", category: "Medical, Health & Nutrition", description: "Learn evidence-informed nutrition planning and client guidance." },
  { id: "first-aid-safety", title: "First Aid & Safety", category: "Medical, Health & Nutrition", description: "Develop confident first response and everyday safety skills." },
  { id: "healthcare-assistant", title: "Healthcare Assistant Essentials", category: "Medical, Health & Nutrition", description: "Practice the foundations of compassionate patient support." },
  { id: "public-health", title: "Public Health & Community Wellness", category: "Medical, Health & Nutrition", description: "Understand prevention, outreach, and healthier communities." },
  { id: "fitness-wellness", title: "Fitness & Wellness Coaching", category: "Medical, Health & Nutrition", description: "Create sustainable movement and wellbeing programs." },
  { id: "google-it-support", title: "Google IT Support", category: "Computer Science, Google & Microsoft Tech", description: "Master troubleshooting, operating systems, and IT service basics." },
  { id: "google-data-analytics", title: "Google Data Analytics", category: "Computer Science, Google & Microsoft Tech", description: "Turn raw information into clear, useful business insights." },
  { id: "google-project-management", title: "Google Project Management", category: "Computer Science, Google & Microsoft Tech", description: "Plan and deliver projects with modern collaborative methods." },
  { id: "azure-fundamentals", title: "Microsoft Azure Fundamentals", category: "Computer Science, Google & Microsoft Tech", description: "Explore cloud concepts, core services, security, and governance." },
  { id: "web-engineering", title: "Web Engineering", category: "Computer Science, Google & Microsoft Tech", description: "Build accessible, responsive, production-ready web experiences." },
  { id: "python-programming", title: "Python Programming & Automation", category: "Computer Science, Google & Microsoft Tech", description: "Automate useful workflows with readable Python code." },
  { id: "cloud-computing", title: "Cloud Computing Essentials", category: "Computer Science, Google & Microsoft Tech", description: "Understand scalable infrastructure and cloud-native delivery." },
  { id: "shopify-operations", title: "Shopify Store Operations", category: "E-Commerce & Digital Business", description: "Launch, manage, and grow an efficient Shopify storefront." },
  { id: "tiktok-shop", title: "TikTok Shop Execution", category: "E-Commerce & Digital Business", description: "Build product content and conversion workflows for social commerce." },
  { id: "digital-marketing", title: "Digital Marketing Strategy", category: "E-Commerce & Digital Business", description: "Plan campaigns across content, search, social, and email." },
  { id: "freelancing", title: "Freelancing Masterclass", category: "E-Commerce & Digital Business", description: "Position your services, win clients, and run a sustainable practice." },
  { id: "ecommerce-growth", title: "E-Commerce Growth Operations", category: "E-Commerce & Digital Business", description: "Improve merchandising, retention, and profitable customer journeys." },
  { id: "social-media", title: "Social Media Business Management", category: "E-Commerce & Digital Business", description: "Manage brand channels with a focused publishing system." },
  { id: "copywriting", title: "Conversion Copywriting", category: "E-Commerce & Digital Business", description: "Write clearer pages, offers, and campaigns that move people to act." },
  { id: "ethical-hacking", title: "Ethical Hacking", category: "Cybersecurity & Networking", description: "Learn responsible vulnerability discovery and security testing." },
  { id: "network-security", title: "Network Security", category: "Cybersecurity & Networking", description: "Protect networks with segmentation, monitoring, and secure design." },
  { id: "cloud-security", title: "Cloud Security", category: "Cybersecurity & Networking", description: "Apply identity, data, and workload protection in the cloud." },
  { id: "web-app-security", title: "Web Application Security", category: "Cybersecurity & Networking", description: "Recognize and prevent common application security weaknesses." },
  { id: "cybersecurity-foundations", title: "Cybersecurity Foundations", category: "Cybersecurity & Networking", description: "Build a practical foundation in threats, controls, and response." },
  { id: "incident-response", title: "Incident Response & Forensics", category: "Cybersecurity & Networking", description: "Prepare for, investigate, and recover from security incidents." },
  { id: "linux-administration", title: "Linux Administration", category: "Cybersecurity & Networking", description: "Operate secure Linux systems and troubleshoot with confidence." },
  { id: "network-administration", title: "Network Administration", category: "Cybersecurity & Networking", description: "Configure, monitor, and maintain reliable business networks." },
  { id: "security-awareness", title: "Security Awareness Leadership", category: "Cybersecurity & Networking", description: "Create human-centered security habits across an organization." },
  { id: "zero-trust", title: "Zero Trust Architecture", category: "Cybersecurity & Networking", description: "Design access policies around continuous verification and least privilege." },
];

export const catalogCategories = [...new Set(catalog.map((course) => course.category))];
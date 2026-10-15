// =====================================================================
//  ✏️  ALL CV CONTENT LIVES HERE — the game builds itself from this file.
//
//  stages[]  → one level section each, in chronological order (oldest first).
//    type    → "education" (ringed planet), "work" (gas giant), "project" (moon)
//              or "toolkit" (space station — its card shows skillGroups)
//    headline→ big chapter headline on the story page
//    color   → planet colour (optional)
//    logo    → logo file path, or a list of paths (optional; shown unmodified on a white badge)
//    skills  → skill chips shown in that chapter
// =====================================================================
window.CV = {
  name: "Mayank Singh Kunwar",
  title: "Senior Backend Software Engineer",
  tagline: "Java · Go · Distributed Systems · Cloud & Kubernetes",
  summary:
    "Senior Backend Software Engineer with 8+ years of experience designing, building and optimising scalable, " +
    "high-performance distributed systems in Java, Go and Spring Boot at Cloudera, Red Hat and Siemens. Delivered a " +
    "100x reduction in query latency through API re-architecture, data sharding and indexing, and a 40% latency " +
    "reduction through caching in Apache Hive. Hands-on experience with microservices, distributed transactions, " +
    "messaging, concurrency, cloud-native deployment on AWS, GCP, Azure and Kubernetes, infrastructure as code with " +
    "Terraform, and CI/CD. Mentor to 20+ engineers. MSc in Advanced Computer Science from Newcastle University, where " +
    "research with IBM on a new io_uring storage backend for Apache ActiveMQ Artemis raised transactional throughput by about 16%.",
  rightToWork: "Eligible for UK Graduate Visa (post-study work), no sponsorship required",

  contact: {
    email: "msingh722@gmail.com",
    linkedin: "https://linkedin.com/in/mayank-kunwwar",
    github: "https://github.com/mayankkunwar",
    website: "",
    location: "Newcastle upon Tyne, UK",
  },

  stages: [
    {
      type: "education",
      title: "BTech Computer Science and Engineering",
      org: "Kumaon Engineering College",
      headline: "Where it all began.",
      color: "#3b82f6",
      period: "2011 – 2015",
      location: "Uttarakhand, India",
      points: ["Uttarakhand Technical University."],
      skills: ["Computer Science"],
    },
    {
      type: "work",
      title: "Software Engineer",
      org: "Siemens",
      headline: "100× faster.",
      logo: "logos/siemens.svg",
      color: "#0d9488",
      period: "Apr 2017 – Jan 2020",
      location: "Bangalore, India",
      points: [
        "Re-architected RESTful APIs and introduced data sharding and indexing strategies, reducing query latency by 100x and significantly improving system scalability.",
        "Developed scalable Java backend services with Spring in an Agile team.",
        "Designed a heartbeat-based asynchronous messaging model to prevent RabbitMQ queue flooding.",
        "Resolved concurrency issues in multi-threaded systems and tuned database interactions for higher performance.",
        "Contributed to Spring-based backend modules and transaction-safe systems.",
      ],
      skills: ["Java", "Spring", "RESTful APIs", "Data Sharding", "RabbitMQ", "Concurrency", "Agile"],
    },
    {
      type: "work",
      title: "Software Engineer",
      org: "Red Hat",
      headline: "Transactions, tamed.",
      logo: "logos/redhat.svg",
      color: "#dc2626",
      period: "Jan 2020 – Jun 2022",
      location: "Bangalore, India",
      points: [
        "Integrated Long Running Action (LRA) distributed transactions for microservices with Red Hat enterprise systems.",
        "Implemented JWT-based authentication to strengthen API security across transaction services.",
        "Built a JMH benchmarking module to identify performance bottlenecks in Java services.",
        "Automated unit and integration (regression) testing with JUnit and Mockito and integrated test suites into Jenkins CI/CD pipelines.",
        "Supported customers in troubleshooting product issues, providing technical guidance and best practices to improve product adoption.",
        "Contributed technical blogs and open-source discussions within the Red Hat community.",
      ],
      skills: ["Distributed Transactions", "Microservices", "JWT", "JMH", "JUnit", "Mockito", "Jenkins CI/CD"],
    },
    {
      type: "work",
      title: "Senior Software Engineer",
      org: "Cloudera",
      headline: "Data at serious scale.",
      logo: "logos/cloudera.svg",
      color: "#f97316",
      period: "Jun 2022 – Aug 2025",
      location: "Bangalore, India",
      points: [
        "Designed and implemented performance-optimised modules in Apache Hive using Java and Go, improving query execution efficiency for large-scale data workloads through horizontal scaling.",
        "Built caching layers using advanced data structures, reducing query latency by 40%.",
        "Led cloud integration initiatives extending Apache Hive compatibility across AWS, Google Cloud Platform (GCP) and Microsoft Azure.",
        "Automated private-cloud cluster deployments by writing Kubernetes automation scripts.",
        "Resolved engineering escalations in partnership with support teams, enabling 30% faster issue resolution.",
        "Mentored 20+ developers through code reviews, technical guidance and knowledge sharing.",
        "Authored internal documentation on product architecture, implementation guidance and engineering best practices.",
      ],
      skills: ["Apache Hive", "Go", "Caching", "Kubernetes", "AWS", "GCP", "Azure", "Horizontal Scaling", "Mentoring"],
    },
    {
      type: "education",
      title: "MSc Advanced Computer Science",
      org: "Newcastle University",
      headline: "Back to first principles.",
      logo: "logos/newcastle.svg",
      color: "#7c3aed",
      period: "2025 – 2026",
      location: "Newcastle upon Tyne, UK",
      points: ["Dissertation in collaboration with IBM on modernising the Apache ActiveMQ Artemis journal (next level →)."],
      skills: ["Advanced CS"],
    },
    {
      type: "project",
      title: "MSc Dissertation: Modernising the Apache ActiveMQ Artemis Journal",
      org: "Newcastle University × IBM",
      headline: "Rewriting the journal.",
      logo: ["logos/newcastle.svg", "logos/ibm.svg"],
      color: "#94a3b8",
      period: "2025 – 2026",
      location: "Research project",
      points: [
        "Replaced the Artemis journal's JNI native layer with the Java Panama Foreign Function & Memory (FFM) API, with no performance regression.",
        "Built a pure-FFM io_uring I/O backend in place of libaio, raising transactional (JTA) throughput by about 16% while preserving the journal's write-then-fdatasync durability guarantees.",
        "Benchmarked throughput, latency and resource usage across both backends; identified open questions on how far io_uring batching can go without breaking recovery and ordering semantics, and on inconsistent fdatasync behaviour under io_uring on some kernel configurations.",
      ],
      skills: ["Java FFM API", "io_uring", "libaio", "ActiveMQ Artemis", "JTA", "Benchmarking"],
    },
    {
      type: "toolkit",
      title: "Technical Toolkit",
      org: "Skills Workshop",
      headline: "The full toolkit.",
      color: "#a78bfa",
      period: "",
      location: "",
      points: [],
      skills: ["Python", "SQL", "Spring Boot", "Quarkus", "PostgreSQL", "DynamoDB", "Amazon SQS", "Docker", "Terraform", "Linux", "System Design", "Performance Tuning"],
    },
  ],

  // Shown on the Toolkit building and in the classic CV (strongest first; years of hands-on use in brackets)
  skillGroups: [
    { label: "Programming Languages", items: ["Java (7 yrs)", "Go (3 yrs)", "SQL", "Python", "JavaScript"] },
    { label: "Operating Systems", items: ["Linux (3 yrs)", "macOS", "Windows"] },
    { label: "Frameworks", items: ["Spring (3+ yrs)", "Spring Boot", "Quarkus", "J2EE"] },
    { label: "Distributed Systems", items: ["Distributed Transactions / LRA (2.5 yrs)", "Concurrency & Multithreading", "Caching", "Data Sharding & Indexing", "Horizontal Scaling", "Microservices", "RESTful APIs", "JWT"] },
    { label: "Storage, Data & Messaging", items: ["Apache Hive (3 yrs)", "RabbitMQ (3 yrs)", "Linux io_uring & libaio", "Apache ActiveMQ Artemis", "PostgreSQL", "MySQL", "Amazon DynamoDB", "Amazon SQS"] },
    { label: "Cloud & Infrastructure", items: ["Kubernetes (3 yrs)", "AWS", "GCP", "Azure", "Docker", "Terraform"] },
    { label: "Testing, QA & Tools", items: ["JMH Benchmarking", "JUnit", "Mockito", "Jenkins CI/CD", "Git", "Maven", "Postman", "Apache Tomcat"] },
    { label: "Practices", items: ["System Design", "Performance Tuning", "Regression Testing", "Technical Documentation", "Code Review", "Mentoring", "Agile"] },
  ],

  // ---------------- Story page (index.html) ----------------
  statement:
    "8+ years designing distributed systems that stay fast under pressure — at Siemens, Red Hat and Cloudera, " +
    "and now in research with IBM at Newcastle University.",

  stats: [
    { value: 8, suffix: "+", label: "years building backend systems" },
    { value: 3, suffix: "", label: "global tech companies" },
    { value: 20, suffix: "+", label: "engineers mentored" },
    { value: 3, suffix: "", label: "clouds: AWS, GCP and Azure" },
  ],

  highlights: [
    { value: "100×", label: "lower query latency from re-architected APIs, data sharding and indexing.", org: "Siemens", logo: "logos/siemens.svg", color: "#0d9488" },
    { value: "40%", label: "lower Apache Hive query latency with new caching layers.", org: "Cloudera", logo: "logos/cloudera.svg", color: "#f97316" },
    { value: "~16%", label: "higher transactional throughput with a pure-FFM io_uring journal backend.", org: "Newcastle University × IBM", logo: "logos/ibm.svg", color: "#3b82f6" },
    { value: "0", label: "performance regression after replacing JNI with Java's FFM API.", org: "Newcastle University × IBM", logo: "logos/newcastle.svg", color: "#7c3aed" },
    { value: "30%", label: "faster resolution of engineering escalations, working with support teams.", org: "Cloudera", logo: "logos/cloudera.svg", color: "#f97316" },
    { value: "20+", label: "developers mentored through code reviews, guidance and knowledge sharing.", org: "Cloudera", logo: "logos/cloudera.svg", color: "#f59e0b" },
  ],

  extras: [],
};

const memberProfiles = {
  // Add the next member with a new URL key, then link to member.html?id=that-key.
  "human-centered-technology": {
    name: "Youssef El Haroun",
    title: "Youth Anthropology and Human-Centered Technology Ambassador",
    lead: "Building technology that begins with culture, identity, and real human experience.",
    image: "assets/images/Team%20members/Image1.jpeg",
    imageAlt: "Youth Collective member portrait",
    description: [
      "As a Youth Anthropology and Human-Centered Technology Ambassador, I focus on the relationship between people, culture, and innovation. I believe that technology becomes more meaningful when it begins with an understanding of how individuals live, communicate, preserve traditions, and experience the world around them.",
      "Growing up at the intersection of American, Azerbaijani, and Egyptian cultures has shaped the way I approach both people and ideas. Being exposed to different languages, customs, values, and social environments taught me to listen carefully, adapt to unfamiliar perspectives, and recognize that the same challenge may be understood differently across communities.",
      "Through my role in Youth Collective, I aim to encourage young people to approach engineering and technology with curiosity, empathy, and cultural awareness. My goal is to help build a community in which technical creativity is guided by real human experiences and where cultural differences are treated not as barriers, but as sources of insight, collaboration, and innovation."
    ]
  },
  "vahid-musayev": {
    name: "Vahid Musayev",
    title: "Mechanical & Electrical R&D Practitioner",
    lead: "Turning existing hardware, practical engineering, and resourcefulness into resilient solutions with community impact.",
    image: "assets/images/Team%20members/Image2.jpeg",
    imageAlt: "Portrait of Vahid Musayev",
    description: [
      "I specialize in adaptive engineering and electro-mechanical deconstruction, transforming legacy hardware into scalable agricultural and environmental solutions. My work combines a strong foundation in physics and heavy engines with practical expertise in electrical systems, allowing me to optimize technology under strict resource constraints.",
      "This multidisciplinary approach drives my commitment to frugal innovation: proving that advanced problem-solving depends on logic, resourcefulness, and cross-functional skill rather than capital alone. Instead of relying on expensive off-the-shelf components, I repurpose existing infrastructure to design high-impact mechanisms suited to the conditions in which they will actually operate.",
      "My hands-on portfolio includes residential greywater filtration systems, specialized environmental controls, and chainsaw engines re-engineered into synchronized agricultural utility vehicles. Through Youth Collective, I aim to use raw mechanics and custom electrical integration to build resilient, efficient technology that delivers practical value and lasting community impact."
    ]
  },
  "ali-gasimov": {
    name: "Ali Gasimov",
    title: "Systems Logic Architect & Environmental Innovator",
    lead: "Connecting a programmer's mindset with real human needs.",
    image: "assets/images/Team%20members/Image3.jpeg",
    imageAlt: "Portrait of Ali Gasimov",
    description: [
      "I view the world as a complex architecture waiting to be debugged. Driven by a developer's mindset, I apply strict algorithmic logic to untangle unpredictable human challenges, transforming messy problems into clear, structured solutions from the ground up.",
      "Growing up as a Lezgin in Azerbaijan taught me to bridge different worlds, an adaptability that directly fuels my work in software architecture. I use this analytical flexibility to design artificial intelligence not merely for screens, but as a practical instrument for making physical environments more accessible and genuinely assisting people.",
      "I channel this approach into Youth Collective by analyzing social dynamics and helping shape inclusive, real-world spaces that promote physical activity, unite communities, and support individual needs. I believe true impact emerges where a programmer's logic meets genuine empathy."
    ]
  },
  "jeyla-ahmadzada": {
    name: "Jeyla Ahmadzada",
    title: "Youth Bioengineering and Accessible Medicine Ambassador",
    lead: "Connecting science, technology, and compassionate care.",
    image: "assets/images/Team%20members/Image4.jpeg",
    imageAlt: "Portrait of Jeyla Ahmadzada",
    description: [
      "As a Youth Bioengineering and Accessible Medicine Ambassador, I explore how medicine, engineering, and careful observation can work together to make healthcare more accessible and human-centered. I am especially interested in diagnostic tools and medical technologies that can make healthcare more affordable, portable, and accessible to communities with limited access to specialized services.",
      "My interest in the human body has been strongly shaped by seven years of classical piano. Playing an instrument taught me to notice posture, coordination, muscle tension, fatigue, and small changes in movement. I learned that discomfort and physical strain often begin with subtle signs that can easily be ignored, which encouraged me to think more deeply about prevention, early observation, and the importance of listening to what the body communicates.",
      "I believe that medicine should not depend only on advanced hospitals or expensive equipment. Useful health information should be available to more people and presented in a way they can understand. At the same time, medical technology must remain accurate, transparent, and honest about its limitations. Through Youth Collective, I aim to encourage young people to explore medicine, biology, and engineering with curiosity and responsibility, treating compassion as an essential part of scientific progress."
    ]
  },
  "ilyas-taghiyev": {
    name: "Ilyas Taghiyev",
    title: "Youth Data Science Educator and Mentorship Ambassador",
    lead: "Helping younger students discover data science through curiosity, confidence, and practical learning.",
    image: "assets/images/Team%20members/Image5.jpeg",
    imageAlt: "Portrait of Ilyas Taghiyev",
    description: [
      "As a Youth Data Science Educator and Mentorship Ambassador, I focus on helping younger students understand data science, technology, and analytical thinking in a way that feels accessible, engaging, and relevant to everyday life.",
      "I believe education should encourage curiosity, build confidence, and help young people recognize their own ability to solve problems. A strong mentor does not simply provide answers, but guides students as they ask questions, test ideas, learn from mistakes, and develop independent ways of thinking.",
      "Through Youth Collective, I aim to introduce children and younger students to data science through interactive workshops, relatable examples, educational activities, and beginner-friendly projects. My goal is to create a supportive environment where students feel comfortable exploring unfamiliar ideas and seeing technology as something they can understand, use, and eventually build themselves."
    ]
  }
};

const params = new URLSearchParams(window.location.search);
const memberId = params.get("id") || "human-centered-technology";
const profile = memberProfiles[memberId];
const page = document.querySelector("[data-member-profile]");
const copyButton = document.querySelector("[data-copy-profile-link]");

if (!profile) {
  document.title = "Profile Not Found | Youth Collective";
  page.innerHTML = `
    <a class="back-link" href="team.html"><span aria-hidden="true">&lt;-</span> Back to Team</a>
    <div class="profile-empty">
      <p class="eyebrow">Member profile</p>
      <h1>Profile not found.</h1>
      <p>This member link does not match a published Youth Collective profile yet.</p>
    </div>
  `;
} else {
  document.title = `${profile.name} | Youth Collective`;
  document.querySelector("[data-member-name]").textContent = profile.name;
  document.querySelector("[data-member-title]").textContent = profile.title;
  document.querySelector("[data-member-lead]").textContent = profile.lead;

  const photo = document.querySelector("[data-member-photo]");
  photo.src = profile.image;
  photo.alt = profile.imageAlt;

  const body = document.querySelector("[data-member-body]");
  body.innerHTML = "";
  profile.description.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    body.appendChild(p);
  });
}

copyButton?.addEventListener("click", async () => {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.set("id", memberId);

  try {
    await navigator.clipboard.writeText(cleanUrl.href);
    copyButton.textContent = "Link copied";
  } catch {
    copyButton.textContent = cleanUrl.href;
  }

  window.setTimeout(() => {
    copyButton.textContent = "Copy profile link";
  }, 2200);
});

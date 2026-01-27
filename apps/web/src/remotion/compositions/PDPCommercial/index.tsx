import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { COLORS, SCENES } from "../../constants";

// Intro Scene - Logo and tagline (matches hero-section.tsx)
const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineY = interpolate(frame, [30, 50], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.primaryBlue} 50%, ${COLORS.darkBlue} 100%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Decorative blurs like marketing site */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `${COLORS.green}20`,
          filter: "blur(100px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `${COLORS.orange}15`,
          filter: "blur(100px)",
        }}
      />

      <div style={{ textAlign: "center", zIndex: 10 }}>
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontSize: 140,
              fontWeight: 800,
              color: COLORS.white,
              letterSpacing: "-3px",
              textShadow: "0 4px 40px rgba(0,0,0,0.3)",
            }}
          >
            Player<span style={{ color: COLORS.green }}>ARC</span>
          </div>
        </div>

        {/* Main Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 20,
            lineHeight: 1.2,
          }}
        >
          Transforming Youth
          <br />
          Sports Development
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 28,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 400,
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          The digital passport that travels with players
          <br />
          throughout their sporting journey
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Feature item component
const FeatureItem = ({
  icon,
  title,
  description,
  delay,
  index,
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
  index: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isLeft = index % 2 === 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity,
        transform: `translateX(${(1 - progress) * (isLeft ? -100 : 100)}px)`,
        marginBottom: 35,
        background: COLORS.white,
        padding: "24px 32px",
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: `2px solid ${COLORS.lightGray}`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          background: `${COLORS.green}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.primaryBlue,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 18, color: COLORS.gray }}>{description}</div>
      </div>
    </div>
  );
};

// Features Scene (matches features-section.tsx & solution-section.tsx)
const FeaturesScene = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const features = [
    {
      icon: "📋",
      title: "Player Passports",
      description: "Digital passports that follow every athlete's journey",
      delay: 15,
    },
    {
      icon: "👨‍🏫",
      title: "Coach Tools",
      description: "Powerful tools for tracking and feedback",
      delay: 30,
    },
    {
      icon: "👨‍👩‍👧",
      title: "Parent Portal",
      description: "Stay connected with your child's development",
      delay: 45,
    },
    {
      icon: "🧠",
      title: "AI-Powered Insights",
      description: "Personalized recommendations for every player",
      delay: 60,
    },
    {
      icon: "🎙️",
      title: "Voice Notes",
      description: "Capture feedback through voice recordings",
      delay: 75,
    },
    {
      icon: "📊",
      title: "Progress Tracking",
      description: "Visual dashboards for development trends",
      delay: 90,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.lightGreen} 100%)`,
        padding: "60px 100px",
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.primaryBlue,
            marginBottom: 10,
          }}
        >
          Everything You Need to Nurture Talent
        </div>
        <div style={{ fontSize: 24, color: COLORS.gray }}>
          Comprehensive tools for coaches, parents, and administrators
        </div>
      </div>

      <div style={{ display: "flex", gap: 40, marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          {features.slice(0, 3).map((f, i) => (
            <FeatureItem key={f.title} {...f} index={i} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {features.slice(3).map((f, i) => (
            <FeatureItem key={f.title} {...f} index={i + 3} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Benefits Scene
const BenefitsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const benefits = [
    {
      text: "Track progress across multiple sports",
      icon: "🏆",
      color: COLORS.green,
    },
    {
      text: "Connect coaches, parents & players",
      icon: "🤝",
      color: COLORS.orange,
    },
    {
      text: "Prevent burnout with wellbeing tracking",
      icon: "💚",
      color: COLORS.green,
    },
  ];

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.primaryBlue} 0%, ${COLORS.darkBlue} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 1200 }}>
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 60,
          }}
        >
          One Platform. Endless Possibilities.
        </div>

        {benefits.map((benefit, index) => {
          const delay = index * 25 + 20;
          const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const scale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          return (
            <div
              key={benefit.text}
              style={{
                opacity,
                transform: `scale(${scale})`,
                fontSize: 42,
                fontWeight: 600,
                color: COLORS.white,
                marginBottom: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: benefit.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                }}
              >
                {benefit.icon}
              </div>
              {benefit.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// CTA Scene (matches final-cta-section.tsx)
const CTAScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 80 },
  });

  const buttonScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // Pulsing effect for the button
  const pulseOpacity = interpolate(Math.sin(frame * 0.15), [-1, 1], [0.85, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.darkBlue} 100%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `${COLORS.green}15`,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `${COLORS.orange}15`,
          filter: "blur(80px)",
        }}
      />

      <div style={{ textAlign: "center", transform: `scale(${scale})`, zIndex: 10 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.white,
            marginBottom: 20,
            textShadow: "0 4px 30px rgba(0,0,0,0.2)",
            lineHeight: 1.2,
          }}
        >
          Ready to Transform Your
          <br />
          Youth Sports Program?
        </div>

        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.8)",
            marginBottom: 40,
          }}
        >
          Join forward-thinking clubs using PlayerARC
        </div>

        <div
          style={{
            transform: `scale(${buttonScale})`,
            opacity: pulseOpacity,
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: COLORS.orange,
              color: COLORS.white,
              fontSize: 32,
              fontWeight: 700,
              padding: "24px 64px",
              borderRadius: 50,
              boxShadow: `0 10px 40px ${COLORS.orange}50`,
            }}
          >
            Request a Demo
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 500,
          }}
        >
          playerarc.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Main composition
export const PDPCommercial = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sequence from={SCENES.intro.start} durationInFrames={SCENES.intro.duration}>
        <IntroScene />
      </Sequence>

      <Sequence from={SCENES.features.start} durationInFrames={SCENES.features.duration}>
        <FeaturesScene />
      </Sequence>

      <Sequence from={SCENES.benefits.start} durationInFrames={SCENES.benefits.duration}>
        <BenefitsScene />
      </Sequence>

      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};

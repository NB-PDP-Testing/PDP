import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, SCENES, STATS } from "../../constants";

// Intro Scene - Logo image and tagline
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

  const taglineOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineY = interpolate(frame, [40, 60], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [70, 90], [0, 1], {
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
      {/* Decorative blurs */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `${COLORS.green}20`,
          filter: "blur(120px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `${COLORS.orange}15`,
          filter: "blur(120px)",
        }}
      />

      <div style={{ textAlign: "center", zIndex: 10 }}>
        {/* Logo Image */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            marginBottom: 30,
          }}
        >
          <Img
            src={staticFile(
              "logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
            )}
            style={{
              width: 280,
              height: 280,
              objectFit: "contain",
              filter: "drop-shadow(0 8px 40px rgba(0,0,0,0.3))",
            }}
          />
        </div>

        {/* Main Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontSize: 64,
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
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 400,
            maxWidth: 900,
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

// Problem Scene - Crisis Stats
const ProblemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.lightGreen} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 1400 }}>
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.primaryBlue,
            marginBottom: 20,
          }}
        >
          We're Losing Our Young Athletes
        </div>
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 28,
            color: COLORS.gray,
            marginBottom: 60,
          }}
        >
          The current youth sports system is failing our children
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 60 }}>
          {STATS.map((stat, index) => {
            const delay = index * 25 + 30;
            const statScale = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, stiffness: 100 },
            });
            const statOpacity = interpolate(frame - delay, [0, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={stat.value}
                style={{
                  opacity: statOpacity,
                  transform: `scale(${statScale})`,
                  textAlign: "center",
                  padding: "40px 50px",
                  background: COLORS.white,
                  borderRadius: 24,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
                  border: `3px solid ${stat.color}30`,
                }}
              >
                <div
                  style={{
                    fontSize: 100,
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.primaryBlue,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Solution Scene - Passport Image
const SolutionScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const passportScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const textOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.darkBlue} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 80,
          maxWidth: 1400,
        }}
      >
        {/* Passport Image */}
        <div
          style={{
            opacity: contentOpacity,
            transform: `scale(${passportScale})`,
            flex: "0 0 auto",
          }}
        >
          <Img
            src={staticFile(
              "passports/PDP-Passport-BrownGold_CameraANDBox.png"
            )}
            style={{
              width: 450,
              height: 450,
              objectFit: "contain",
              filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.4))",
            }}
          />
        </div>

        {/* Text Content */}
        <div style={{ flex: 1, opacity: textOpacity }}>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: COLORS.white,
              marginBottom: 24,
              lineHeight: 1.2,
            }}
          >
            Our Solution:
            <br />
            <span style={{ color: COLORS.green }}>A Digital Passport</span>
            <br />
            for Every Player
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.6,
            }}
          >
            Track, nurture, and celebrate every child's sporting journey. Keep
            players engaged, healthy, and performing at their best.
          </div>
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
        marginBottom: 28,
        background: COLORS.white,
        padding: "20px 28px",
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: `2px solid ${COLORS.lightGray}`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: `${COLORS.green}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.primaryBlue,
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 16, color: COLORS.gray }}>{description}</div>
      </div>
    </div>
  );
};

// Features Scene
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
      description: "Digital profiles that follow every athlete's journey",
      delay: 15,
    },
    {
      icon: "👨‍🏫",
      title: "Coach Tools",
      description: "Assessments, voice notes, and development tracking",
      delay: 28,
    },
    {
      icon: "👨‍👩‍👧",
      title: "Parent Portal",
      description: "Stay connected with your child's progress",
      delay: 41,
    },
    {
      icon: "🧠",
      title: "AI-Powered Insights",
      description: "Personalized recommendations for every player",
      delay: 54,
    },
    {
      icon: "🎙️",
      title: "Voice Notes",
      description: "Capture feedback with AI transcription",
      delay: 67,
    },
    {
      icon: "📊",
      title: "Progress Tracking",
      description: "Visual dashboards for development trends",
      delay: 80,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.lightGreen} 100%)`,
        padding: "50px 80px",
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.primaryBlue,
            marginBottom: 8,
          }}
        >
          Everything You Need to Nurture Talent
        </div>
        <div style={{ fontSize: 22, color: COLORS.gray }}>
          Comprehensive tools for coaches, parents, and administrators
        </div>
      </div>

      <div style={{ display: "flex", gap: 40 }}>
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
            fontSize: 52,
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
                fontSize: 44,
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
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: benefit.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
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

// CTA Scene
const CTAScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 80 },
  });

  const buttonScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

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
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `${COLORS.green}15`,
          filter: "blur(100px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `${COLORS.orange}15`,
          filter: "blur(100px)",
        }}
      />

      <div
        style={{
          textAlign: "center",
          transform: `scale(${scale})`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: COLORS.white,
            marginBottom: 24,
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
            fontSize: 30,
            color: "rgba(255,255,255,0.8)",
            marginBottom: 50,
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
              fontSize: 36,
              fontWeight: 700,
              padding: "28px 72px",
              borderRadius: 60,
              boxShadow: `0 12px 50px ${COLORS.orange}50`,
            }}
          >
            Request a Demo
          </div>
        </div>

        <div
          style={{
            marginTop: 50,
            fontSize: 28,
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
export const PDPCommercial = () => (
  <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
    <Sequence
      durationInFrames={SCENES.intro.duration}
      from={SCENES.intro.start}
    >
      <IntroScene />
    </Sequence>

    <Sequence
      durationInFrames={SCENES.problem.duration}
      from={SCENES.problem.start}
    >
      <ProblemScene />
    </Sequence>

    <Sequence
      durationInFrames={SCENES.solution.duration}
      from={SCENES.solution.start}
    >
      <SolutionScene />
    </Sequence>

    <Sequence
      durationInFrames={SCENES.features.duration}
      from={SCENES.features.start}
    >
      <FeaturesScene />
    </Sequence>

    <Sequence
      durationInFrames={SCENES.benefits.duration}
      from={SCENES.benefits.start}
    >
      <BenefitsScene />
    </Sequence>

    <Sequence durationInFrames={SCENES.cta.duration} from={SCENES.cta.start}>
      <CTAScene />
    </Sequence>
  </AbsoluteFill>
);

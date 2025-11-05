import * as THREE from "three";

export function createObjectiveDisplay() {
  // Create audio element for popup sound
  const popupSound = new Audio("/notification.wav");
  popupSound.volume = 0.5; // Adjust volume as needed

  const container = document.createElement("div");
  container.id = "objective-container";

  // Create objective text element
  const objectiveText = document.createElement("div");
  objectiveText.id = "objective-text";
  objectiveText.textContent = "Follow the arrow";

  // Add elements to container
  container.appendChild(objectiveText);

  const styles = `
        #objective-container {
            position: absolute;
            top: -100px; /* Start off-screen from top */
            align-items: center;
            background: linear-gradient(
                135deg,
                rgba(108, 122, 137, 0.1),
                rgba(108, 122, 137, 0.1)
            );
            padding: 15px 25px;
            border: 1px solid rgba(0, 255, 255, 0.3);
            z-index: 1000;
            min-width: 300px;
            backdrop-filter: blur(5px);
            box-shadow: 
                0 0 20px rgba(0, 150, 255, 0.2),
                inset 0 0 20px rgba(0, 150, 255, 0.1);
            clip-path: polygon(
                0 10px, 10px 0,
                calc(100% - 10px) 0, 100% 10px,
                100% calc(100% - 10px), calc(100% - 10px) 100%,
                10px 100%, 0 calc(100% - 10px)
            );
            transform: translateY(0);
            transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }

        #objective-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                90deg,
                transparent 0%,
                transparent 10%,
                rgba(0, 255, 255, 0.5) 50%,
                transparent 90%,
                transparent 100%
            );
            animation: scanline 2s linear infinite;
            pointer-events: none;
            mask: linear-gradient(
                45deg,
                transparent 0%,
                black 20%,
                black 80%,
                transparent 100%
            );
            -webkit-mask: linear-gradient(
                90deg,
                transparent 0%,
                black 20%,
                black 80%,
                transparent 100%
            );
        }

        #objective-text {
            color: #ffffff;
            font-family: 'Orbitron', sans-serif;
            font-size: 16px;
            font-weight: 500;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            position: relative;
            padding-left: 25px;
            letter-spacing: 1px;
            white-space: nowrap;
        }

        #objective-text::before {
            content: '▶';
            position: absolute;
            left: 0;
            color: #00ffff;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            animation: pulse 2s infinite;
        }

        .next-objective-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1001;
            text-align: center;
            width: 100%;
            pointer-events: none;
        }

        .next-objective {
            display: inline-block;
            background: linear-gradient(
                45deg,
                transparent 0%,
                rgba(0, 0, 0, 0.1) 20%,
                rgba(0, 0, 0, 0.2) 50%,
                rgba(0, 0, 0, 0.2) 80%,
                transparent 100%
            );
            padding: 30px 60px;
            width: 600px;
            color: #ffffff;
            font-family: 'Orbitron', sans-serif;
            font-size: 24px;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            opacity: 0;
            transform: scale(0);
            position: relative;
            backdrop-filter: blur(5px);
        }

        .next-objective::before,
        .next-objective::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 0;
            height: 2px;
            background: linear-gradient(
                45deg,
                transparent,
                #ffffff 20%,
                transparent
            );
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
            transition: width 0.5s ease;
        }

        .next-objective::before {
            right: 100%;
            margin-right: 15px;
        }

        .next-objective::after {
            left: 100%;
            margin-left: 15px;
        }

        .next-objective.show {
            animation: popIn 0.5s forwards;
        }

        .next-objective.show::before,
        .next-objective.show::after {
            width: 150px;
        }

        @keyframes scanline {
            0% { 
                transform: translateX(-100%);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% { 
                transform: translateX(100%);
                opacity: 0;
            }
        }

        @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
        }

        @keyframes popIn {
            0% { 
                opacity: 0;
                transform: scale(0.8);
            }
            50% { 
                opacity: 1;
                transform: scale(1.1);
            }
            100% { 
                opacity: 1;
                transform: scale(1);
            }
        }
    `;

  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Add Google Font
  const fontLink = document.createElement("link");
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600&display=swap";
  fontLink.rel = "stylesheet";
  document.head.appendChild(fontLink);

  document.body.appendChild(container);

  // Initial slide in animation from top
  setTimeout(() => {
    container.style.transform = "translateY(130px)"; // Move down to final position
  }, 500);

  let currentObjective = 0;

  function showNextObjective(text) {
    if (objectiveText) {
      objectiveText.textContent = text;
    }
  }

  function updateObjectiveText(playerPosition) {
    // First objective trigger at (-22, 2, 20)
    const targetPosition = new THREE.Vector3(-22, 2, 20);
    const distance = playerPosition.distanceTo(targetPosition);

    // Second objective trigger at (55, 2, 5)
    const targetPosition2 = new THREE.Vector3(58, 2, 5);
    const distance2 = playerPosition.distanceTo(targetPosition2);

    // Final cleanup trigger at (84.1, 2.4, -26.2)
    const finalPosition = new THREE.Vector3(84.1, 2.4, -26.2);
    const finalDistance = playerPosition.distanceTo(finalPosition);

    if (distance < 5 && currentObjective === 0) {
      currentObjective = 1;

      // Slide out animation (up)
      container.style.transform = "translateY(-100px)";

      setTimeout(() => {
        objectiveText.textContent = "Collect the ticket to board spaceship";
        // Slide in animation (from top)
        container.style.transform = "translateY(130px)";
        showNextObjective("Collect the ticket to board spaceship");
      }, 600);
    }
    // Check for second objective trigger
    else if (distance2 < 5 && currentObjective === 1) {
      currentObjective = 2;

      // Slide out animation (up)
      container.style.transform = "translateY(-100px)";

      setTimeout(() => {
        objectiveText.textContent = "Board the spacecraft";
        // Slide in animation (from top)
        container.style.transform = "translateY(130px)";
        showNextObjective("Press enter to board the spacecraft");
      }, 600);
    }
    // Final cleanup trigger
    else if (finalDistance < 8) {
      cleanup();
    }
  }

  function cleanup() {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    if (styleSheet && styleSheet.parentNode) {
      styleSheet.parentNode.removeChild(styleSheet);
    }
    if (fontLink && fontLink.parentNode) {
      fontLink.parentNode.removeChild(fontLink);
    }
    // Clean up audio
    popupSound.src = "";
  }

  return {
    updateObjectiveText,
    cleanup,
  };
}

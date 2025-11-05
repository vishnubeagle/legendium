// Fix for Take Quiz button visibility in lesson2
// Replace the refreshFromState function with this improved version

function refreshFromState() {
  if (!currentLessonName) return;
  const cfg = getLessonConfig(currentLessonName);
  if (!cfg) return;
  const labels = cfg.labels || [];
  const contents = cfg.contents || [];
  const count = Math.min(labels.length, contents.length);
  if (count === 0) return;
  currentLessonIndex = clampIndex(currentLessonIndex, count);
  const title = labels[currentLessonIndex] || "";
  const body = contents[currentLessonIndex] || "";
  const bodySectioned = formatAsSections(body);
  const instruction = 0;
  updateLearningPanelContent(title, bodySectioned, instruction);
  try { ThreeMeshUI.update(); } catch (e) {}

  // Show arrow only while there is a next label within the current lesson
  if (learningNextArrow) {
    const hasNext = currentLessonName && currentLessonIndex < (count - 1);
    learningNextArrow.visible = !!hasNext;
    
    // Find the footer row more reliably
    let footerRow = null;
    if (learningPanel && learningPanel.children) {
      // Look for the footer row by checking if it contains the next arrow
      for (let i = 0; i < learningPanel.children.length; i++) {
        const child = learningPanel.children[i];
        if (child && child.children && child.children.includes(learningNextArrow)) {
          footerRow = child;
          break;
        }
      }
    }
    
    // Ensure quiz button exists and toggle it on last item
    if (footerRow) {
      ensureQuizButton(footerRow);
    }
    
    if (learningQuizButton) {
      // Default behavior: show quiz on last label of any lesson
      const atLast = !hasNext;
      learningQuizButton.visible = atLast;
      

      
      // Explicitly ensure quiz is visible on lesson2 last label as well (redundant but safe)
      try {
        if (window.getCurrentLesson && window.getCurrentLesson() === 'lesson2' && atLast) {
          learningQuizButton.visible = true;
   
        }
      } catch (e) {}
      try { ThreeMeshUI.update(); } catch (e) {}
    }
  }
}

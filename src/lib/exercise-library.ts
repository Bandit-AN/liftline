// Built-in exercise demonstrations.
// Photos: Free Exercise DB (github.com/yuhonas/free-exercise-db), released into
// the public domain (Unlicense). Frame 0 = start position, frame 1 = end position.
// Coaching text (steps, breathing, common mistakes) written for Liftline.

export interface BuiltinDemo {
  key: string;
  name: string;
  equipment: string;
  muscles: string;
  steps: string[];
  breathing: string;
  mistakes: string[];
  /** Other names coaches might type for this exact exercise + equipment. */
  aliases?: string[];
}

export const DEMO_IMAGE_CREDIT = "Photos: Free Exercise DB (public domain)";

export const BUILTIN_DEMOS: BuiltinDemo[] = [
  // ── Squat & lunge patterns ───────────────────────────────────────────
  {
    key: "back-squat", name: "Back Squat", equipment: "Barbell + squat rack", muscles: "Quads, glutes, adductors",
    steps: [
      "Set the bar at upper-chest height. Step under it so it sits on your upper back, not your neck.",
      "Unrack, take two steps back, feet shoulder-width, toes turned out slightly.",
      "Sit down and back between your hips, knees tracking over your toes, to at least thighs parallel.",
      "Drive up through your whole foot, keeping your chest and hips rising together.",
    ],
    breathing: "Big breath into your belly and brace before each rep. Hold it on the way down, exhale once you pass the hardest part on the way up.",
    mistakes: ["Knees caving inward", "Heels lifting off the floor", "Hips shooting up first so the chest drops", "Cutting depth short"],
    aliases: ["Squat", "Barbell Squat", "High Bar Squat"],
  },
  {
    key: "front-squat", name: "Front Squat", equipment: "Barbell + squat rack", muscles: "Quads, glutes, upper back",
    steps: [
      "Rest the bar on the front of your shoulders, fingertips under the bar, elbows high.",
      "Feet shoulder-width, toes slightly out. Keep your torso tall.",
      "Squat straight down until thighs are at least parallel, elbows staying up.",
      "Stand up by driving elbows up and pushing the floor away.",
    ],
    breathing: "Brace with a full breath before descending, hold through the bottom, exhale near the top.",
    mistakes: ["Elbows dropping so the bar rolls forward", "Rounding the upper back", "Shifting weight onto the toes"],
    aliases: ["Barbell Front Squat"],
  },
  {
    key: "goblet-squat", name: "Goblet Squat", equipment: "Kettlebell", muscles: "Quads, glutes, core",
    steps: [
      "Hold the kettlebell by the horns close to your chest.",
      "Feet a little wider than hips, toes slightly out.",
      "Squat down between your heels, elbows inside your knees at the bottom.",
      "Stand back up keeping the bell tight to your chest.",
    ],
    breathing: "Inhale on the way down, exhale as you stand.",
    mistakes: ["Letting the weight drift away from the body", "Rounding forward at the bottom", "Knees collapsing inward"],
    aliases: ["Kettlebell Goblet Squat", "Dumbbell Goblet Squat"],
  },
  {
    key: "leg-press", name: "Leg Press", equipment: "Leg press machine", muscles: "Quads, glutes",
    steps: [
      "Sit with your back and hips flat against the pad, feet hip-width in the middle of the platform.",
      "Release the safeties and press the platform to just short of locking your knees.",
      "Lower under control until knees are around 90° or just before your lower back lifts.",
      "Press back up through your heels and midfoot.",
    ],
    breathing: "Inhale as the platform comes down, exhale as you press.",
    mistakes: ["Hips rolling off the seat at the bottom", "Locking the knees hard at the top", "Pushing through the toes only"],
    aliases: ["Machine Leg Press", "45 Degree Leg Press"],
  },
  {
    key: "bulgarian-split-squat", name: "Bulgarian Split Squat", equipment: "Dumbbells + bench", muscles: "Quads, glutes",
    steps: [
      "Hold dumbbells at your sides. Place the top of your back foot on a bench behind you.",
      "Hop the front foot forward so your front shin can stay fairly vertical.",
      "Lower straight down until the back knee is just above the floor.",
      "Push through the front heel to stand. Finish all reps, then switch legs.",
    ],
    breathing: "Inhale as you lower, exhale as you push up.",
    mistakes: ["Front foot too close to the bench", "Pushing off the back leg instead of the front", "Front knee caving in"],
    aliases: ["Rear Foot Elevated Split Squat", "RFESS", "Split Squat"],
  },
  {
    key: "walking-lunge", name: "Walking Lunge", equipment: "Barbell", muscles: "Quads, glutes, adductors",
    steps: [
      "Hold the bar on your upper back as for a back squat. Stand tall.",
      "Take a long step forward and lower until the back knee nearly touches the floor.",
      "Push through the front foot and bring the back leg through into the next step.",
      "Keep alternating legs, torso upright the whole time.",
    ],
    breathing: "Inhale as you step and lower, exhale as you drive up.",
    mistakes: ["Steps too short so the front knee shoots forward", "Leaning the torso forward", "Wobbling: slow down and keep feet hip-width"],
    aliases: ["Barbell Walking Lunge", "Lunge", "Lunges"],
  },
  {
    key: "step-up", name: "Step-Up", equipment: "Dumbbells + box or bench", muscles: "Quads, glutes",
    steps: [
      "Hold dumbbells at your sides facing a knee-height box or bench.",
      "Place one whole foot on the box.",
      "Drive through that foot to stand on top. Don't push off the back leg.",
      "Step down with control. Finish the set, then switch legs.",
    ],
    breathing: "Exhale as you step up, inhale on the way down.",
    mistakes: ["Bouncing off the floor leg", "Only the toes on the box", "Box too high to control"],
    aliases: ["Dumbbell Step-Up", "Box Step-Up"],
  },
  // ── Hinges ───────────────────────────────────────────────────────────
  {
    key: "conventional-deadlift", name: "Conventional Deadlift", equipment: "Barbell", muscles: "Glutes, hamstrings, back",
    steps: [
      "Stand with the bar over your midfoot, feet hip-width.",
      "Hinge down and grip just outside your legs. Shins touch the bar, back flat, chest up.",
      "Pull the slack out of the bar, then push the floor away and stand tall.",
      "Lower by pushing your hips back first, keeping the bar close to your legs.",
    ],
    breathing: "Breathe in and brace hard before each pull. Hold it until you're standing, then exhale and reset.",
    mistakes: ["Rounding the lower back", "Bar drifting away from the legs", "Jerking the bar off the floor", "Leaning back at the top"],
    aliases: ["Deadlift", "Barbell Deadlift"],
  },
  {
    key: "trap-bar-deadlift", name: "Trap Bar Deadlift", equipment: "Trap (hex) bar", muscles: "Quads, glutes, hamstrings, back",
    steps: [
      "Stand in the centre of the trap bar, feet hip-width.",
      "Hinge and bend your knees to grip the handles, back flat, chest up.",
      "Push the floor away and stand tall, hips and shoulders rising together.",
      "Lower under control along the same path.",
    ],
    breathing: "Brace with a full breath before each rep, exhale at the top.",
    mistakes: ["Standing off-centre in the bar", "Rounding the back", "Hyperextending at the top"],
    aliases: ["Hex Bar Deadlift"],
  },
  {
    key: "romanian-deadlift", name: "Romanian Deadlift", equipment: "Barbell", muscles: "Hamstrings, glutes",
    steps: [
      "Stand tall holding the bar at your thighs, soft knees.",
      "Push your hips back and slide the bar down your thighs, back flat.",
      "Stop when you feel a strong hamstring stretch, usually just below the knee.",
      "Drive your hips forward to stand back up.",
    ],
    breathing: "Inhale and brace at the top, hold it on the way down, exhale as you stand.",
    mistakes: ["Squatting the weight down instead of hinging", "Rounding the back to reach lower", "Bar drifting away from the legs"],
    aliases: ["RDL", "Barbell RDL", "Barbell Romanian Deadlift"],
  },
  {
    key: "hip-thrust", name: "Hip Thrust", equipment: "Barbell + bench", muscles: "Glutes",
    steps: [
      "Sit with your upper back against a bench, bar padded across your hips.",
      "Feet flat, about hip-width, knees bent.",
      "Drive through your heels to lift your hips until your body is flat from shoulders to knees.",
      "Squeeze your glutes for a second, then lower with control.",
    ],
    breathing: "Exhale as you drive up, inhale as you lower.",
    mistakes: ["Arching the lower back at the top", "Feet too far out (hamstrings take over)", "Rushing without a pause at the top"],
    aliases: ["Barbell Hip Thrust", "Glute Thrust"],
  },
  {
    key: "glute-bridge", name: "Glute Bridge", equipment: "Bodyweight", muscles: "Glutes, hamstrings",
    steps: [
      "Lie on your back, knees bent, feet flat and hip-width.",
      "Press through your heels and lift your hips until your body is straight from shoulders to knees.",
      "Squeeze your glutes at the top for a second.",
      "Lower slowly back to the floor.",
    ],
    breathing: "Exhale as you lift, inhale as you lower.",
    mistakes: ["Arching the lower back instead of using the glutes", "Pushing through the toes", "Knees falling out or in"],
    aliases: ["Bridge", "Floor Glute Bridge"],
  },
  {
    key: "kettlebell-swing", name: "One-Arm Kettlebell Swing", equipment: "Kettlebell", muscles: "Glutes, hamstrings, core",
    steps: [
      "Stand with feet a little wider than hips, kettlebell in one hand.",
      "Hinge and hike the bell back between your legs.",
      "Snap your hips forward to float the bell to chest height. Your arm just guides it.",
      "Let it fall back and hinge again. Switch hands each set.",
    ],
    breathing: "Short sharp exhale as your hips snap forward, inhale as the bell swings back.",
    mistakes: ["Squatting instead of hinging", "Lifting with the arm or shoulder", "Leaning back at the top"],
    aliases: ["Kettlebell Swing", "KB Swing", "Single-Arm Kettlebell Swing"],
  },
  // ── Leg isolation ────────────────────────────────────────────────────
  {
    key: "lying-leg-curl", name: "Lying Leg Curl", equipment: "Leg curl machine", muscles: "Hamstrings",
    steps: [
      "Lie face down with the pad just above your heels and knees just off the bench.",
      "Hold the handles and keep your hips pressed down.",
      "Curl your heels toward your glutes as far as you can.",
      "Lower slowly to almost straight.",
    ],
    breathing: "Exhale as you curl, inhale as you lower.",
    mistakes: ["Hips lifting off the pad", "Swinging the weight", "Dropping it fast on the way down"],
    aliases: ["Leg Curl", "Hamstring Curl", "Machine Leg Curl"],
  },
  {
    key: "leg-extension", name: "Leg Extension", equipment: "Leg extension machine", muscles: "Quads",
    steps: [
      "Sit with your back on the pad, knees lined up with the machine's pivot.",
      "Set the shin pad just above your ankles.",
      "Straighten your legs until your knees are nearly locked. Squeeze briefly.",
      "Lower under control.",
    ],
    breathing: "Exhale as you extend, inhale as you lower.",
    mistakes: ["Kicking the weight up with momentum", "Hips lifting off the seat", "Knees not lined up with the pivot"],
    aliases: ["Leg Extensions", "Quad Extension"],
  },
  {
    key: "standing-calf-raise", name: "Standing Calf Raise", equipment: "Calf raise machine", muscles: "Calves",
    steps: [
      "Stand under the shoulder pads with the balls of your feet on the step.",
      "Lower your heels as far as is comfortable for a full stretch.",
      "Rise up onto your toes as high as you can and pause.",
      "Lower slowly back into the stretch.",
    ],
    breathing: "Exhale as you rise, inhale as you lower.",
    mistakes: ["Bouncing out of the bottom", "Bending the knees to help", "Half reps"],
    aliases: ["Calf Raise", "Machine Calf Raise"],
  },
  {
    key: "seated-calf-raise", name: "Seated Calf Raise", equipment: "Seated calf machine", muscles: "Calves (soleus)",
    steps: [
      "Sit with the balls of your feet on the step and the pad on your lower thighs.",
      "Release the safety and lower your heels into a full stretch.",
      "Push up onto your toes as high as possible and pause.",
      "Lower slowly.",
    ],
    breathing: "Exhale as you push up, inhale as you lower.",
    mistakes: ["Bouncing at the bottom", "Using too much weight for a short range"],
  },
  // ── Push ─────────────────────────────────────────────────────────────
  {
    key: "barbell-bench-press", name: "Barbell Bench Press", equipment: "Barbell + bench", muscles: "Chest, shoulders, triceps",
    steps: [
      "Lie with eyes under the bar, feet planted, shoulder blades squeezed together and down.",
      "Grip a little wider than shoulder-width and unrack with straight arms.",
      "Lower the bar to your mid-chest, elbows about 45° from your body.",
      "Press back up over your shoulders.",
    ],
    breathing: "Breathe in and hold as the bar comes down, exhale as you press past the sticking point.",
    mistakes: ["Elbows flared straight out to the sides", "Bouncing the bar off the chest", "Hips lifting off the bench", "Shoulders rolling forward"],
    aliases: ["Bench Press", "Flat Bench Press", "Barbell Bench"],
  },
  {
    key: "incline-dumbbell-press", name: "Incline Dumbbell Press", equipment: "Dumbbells + incline bench", muscles: "Upper chest, shoulders, triceps",
    steps: [
      "Set the bench to about 30°. Sit back with the dumbbells on your thighs, then kick them up as you lie back.",
      "Start with the dumbbells over your upper chest, palms forward.",
      "Lower until your elbows are just below the bench line.",
      "Press up and slightly in, without clanking the weights together.",
    ],
    breathing: "Inhale as you lower, exhale as you press.",
    mistakes: ["Bench set too steep (turns into a shoulder press)", "Elbows flared at 90°", "Dropping the weights fast"],
    aliases: ["Incline DB Press", "Incline Dumbbell Bench Press"],
  },
  {
    key: "dumbbell-bench-press", name: "Dumbbell Bench Press", equipment: "Dumbbells + flat bench", muscles: "Chest, shoulders, triceps",
    steps: [
      "Lie on a flat bench with dumbbells over your chest, shoulder blades pulled back.",
      "Lower the weights to the sides of your chest, elbows about 45°.",
      "Press back up until your arms are straight.",
      "Keep your feet planted the whole set.",
    ],
    breathing: "Inhale on the way down, exhale as you press.",
    mistakes: ["Losing control at the bottom", "Shoulders shrugging up", "Hips lifting"],
    aliases: ["DB Bench Press", "Flat Dumbbell Press"],
  },
  {
    key: "push-up", name: "Push-Up", equipment: "Bodyweight", muscles: "Chest, shoulders, triceps, core",
    steps: [
      "Hands slightly wider than shoulders, body in a straight line from head to heels.",
      "Squeeze your glutes and brace your stomach.",
      "Lower until your chest is a fist's height from the floor, elbows about 45°.",
      "Push the floor away back to the top.",
    ],
    breathing: "Inhale as you lower, exhale as you push up.",
    mistakes: ["Hips sagging", "Head poking forward", "Partial reps"],
    aliases: ["Pushup", "Push Up", "Press-Up"],
  },
  {
    key: "dips", name: "Dips", equipment: "Parallel bars", muscles: "Triceps, chest, shoulders",
    steps: [
      "Support yourself on straight arms on the bars, body upright.",
      "Bend your elbows to lower until your upper arms are about parallel to the floor.",
      "Keep your elbows tucked back, not flared.",
      "Press back up to straight arms.",
    ],
    breathing: "Inhale as you lower, exhale as you press up.",
    mistakes: ["Going too deep and straining the shoulders", "Shrugging shoulders to the ears", "Swinging the legs"],
    aliases: ["Dip", "Parallel Bar Dips", "Triceps Dips"],
  },
  {
    key: "overhead-press", name: "Overhead Press", equipment: "Barbell", muscles: "Shoulders, triceps, upper chest",
    steps: [
      "Hold the bar on your front shoulders, hands just outside shoulder-width, elbows slightly in front of the bar.",
      "Squeeze your glutes and brace.",
      "Press the bar straight up, moving your head back slightly to clear it, then through once it passes.",
      "Lock out overhead with the bar over your midfoot, then lower to your shoulders.",
    ],
    breathing: "Brace with a breath before each press, exhale at lockout.",
    mistakes: ["Leaning back and arching the lower back", "Pressing the bar forward around the face", "Not finishing with arms locked overhead"],
    aliases: ["Military Press", "Standing Press", "OHP", "Barbell Overhead Press"],
  },
  {
    key: "seated-dumbbell-press", name: "Seated Dumbbell Press", equipment: "Dumbbells + upright bench", muscles: "Shoulders, triceps",
    steps: [
      "Sit on an upright bench with dumbbells at shoulder height, palms forward.",
      "Press both weights overhead until your arms are straight.",
      "Lower back to ear height under control.",
      "Keep your back against the pad throughout.",
    ],
    breathing: "Exhale as you press, inhale as you lower.",
    mistakes: ["Arching off the bench", "Dropping the weights too low and losing tension", "Clashing the dumbbells together"],
    aliases: ["Seated Shoulder Press", "Dumbbell Shoulder Press", "DB Shoulder Press"],
  },
  {
    key: "seated-cable-lateral-raise", name: "Seated Cable Lateral Raise", equipment: "Cable (low pulleys)", muscles: "Side delts",
    steps: [
      "Sit on a bench between two low pulleys, holding the opposite handle in each hand.",
      "With a slight bend in the elbows, raise your arms out to the sides.",
      "Stop at shoulder height, leading with the elbows.",
      "Lower slowly against the cable.",
    ],
    breathing: "Exhale as you raise, inhale as you lower.",
    mistakes: ["Shrugging the shoulders up", "Swinging the torso", "Raising above shoulder height"],
    aliases: ["Cable Lateral Raise", "Cable Side Raise"],
  },
  {
    key: "dumbbell-lateral-raise", name: "Dumbbell Lateral Raise", equipment: "Dumbbells", muscles: "Side delts",
    steps: [
      "Stand tall with light dumbbells at your sides.",
      "With a slight bend in the elbows, raise the weights out to the sides.",
      "Stop at shoulder height, elbows leading.",
      "Lower slowly.",
    ],
    breathing: "Exhale as you raise, inhale as you lower.",
    mistakes: ["Using momentum from the hips", "Shrugging", "Weights too heavy to control"],
    aliases: ["Lateral Raise", "Side Lateral Raise", "DB Lateral Raise"],
  },
  // ── Pull ─────────────────────────────────────────────────────────────
  {
    key: "face-pull", name: "Face Pull", equipment: "Cable + rope", muscles: "Rear delts, upper back, rotator cuff",
    steps: [
      "Set a rope at upper-chest to face height. Grip with thumbs facing you.",
      "Step back so the cable is tight, arms straight.",
      "Pull the rope toward your face, splitting it apart and finishing with hands beside your ears.",
      "Return slowly to straight arms.",
    ],
    breathing: "Exhale as you pull, inhale as you return.",
    mistakes: ["Leaning back to move more weight", "Pulling to the chest instead of the face", "Elbows dropping below the hands"],
    aliases: ["Rope Face Pull", "Cable Face Pull"],
  },
  {
    key: "reverse-dumbbell-fly", name: "Reverse Dumbbell Fly", equipment: "Dumbbells + incline bench", muscles: "Rear delts, upper back",
    steps: [
      "Lie chest-down on an incline bench with dumbbells hanging below you.",
      "With a slight bend in the elbows, raise the weights out to the sides.",
      "Squeeze your shoulder blades together at the top.",
      "Lower slowly.",
    ],
    breathing: "Exhale as you raise, inhale as you lower.",
    mistakes: ["Bending the elbows more to cheat the weight up", "Shrugging", "Weights too heavy"],
    aliases: ["Rear Delt Fly", "Reverse Fly", "Chest-Supported Reverse Fly"],
  },
  {
    key: "pull-up", name: "Pull-Up", equipment: "Pull-up bar", muscles: "Lats, upper back, biceps",
    steps: [
      "Hang from the bar with an overhand grip slightly wider than your shoulders.",
      "Pull your shoulder blades down, then pull your chest toward the bar.",
      "Get your chin over the bar.",
      "Lower all the way to straight arms.",
    ],
    breathing: "Exhale as you pull up, inhale as you lower.",
    mistakes: ["Kipping or swinging", "Half reps that never reach straight arms", "Chin poking up instead of chest leading"],
    aliases: ["Pullup", "Pull Up", "Pullups"],
  },
  {
    key: "weighted-pull-up", name: "Weighted Pull-Up", equipment: "Pull-up bar + dip belt", muscles: "Lats, upper back, biceps",
    steps: [
      "Attach the weight to a dip belt so it hangs between your legs.",
      "Hang with an overhand grip slightly wider than shoulders.",
      "Pull until your chin clears the bar, keeping the weight still.",
      "Lower under control to straight arms.",
    ],
    breathing: "Exhale on the way up, inhale on the way down.",
    mistakes: ["The weight swinging", "Shortening the range to use more load", "Shrugging at the bottom"],
    aliases: ["Weighted Pullup", "Weighted Pull Up"],
  },
  {
    key: "chin-up", name: "Chin-Up", equipment: "Pull-up bar", muscles: "Lats, biceps",
    steps: [
      "Hang with an underhand grip, hands shoulder-width.",
      "Pull your chest toward the bar.",
      "Get your chin over the bar.",
      "Lower to straight arms.",
    ],
    breathing: "Exhale on the way up, inhale on the way down.",
    mistakes: ["Swinging", "Not lowering fully", "Reaching with the chin"],
    aliases: ["Chinup", "Chin Up"],
  },
  {
    key: "lat-pulldown", name: "Lat Pulldown", equipment: "Cable pulldown machine", muscles: "Lats, upper back",
    steps: [
      "Sit with thighs under the pad and take a wide overhand grip.",
      "Lean back slightly and pull your shoulder blades down.",
      "Pull the bar to your upper chest, elbows down and back.",
      "Let it rise slowly to straight arms.",
    ],
    breathing: "Exhale as you pull down, inhale as the bar rises.",
    mistakes: ["Pulling behind the neck", "Leaning way back and rowing it", "Letting the stack slam"],
    aliases: ["Wide-Grip Lat Pulldown", "Pulldown", "Lat Pull Down"],
  },
  {
    key: "chest-supported-dumbbell-row", name: "Chest-Supported Dumbbell Row", equipment: "Dumbbells + incline bench", muscles: "Upper back, lats",
    steps: [
      "Lie chest-down on an incline bench with dumbbells hanging straight down.",
      "Row the weights toward your hips, elbows close to your sides.",
      "Squeeze your shoulder blades together at the top.",
      "Lower to straight arms.",
    ],
    breathing: "Exhale as you row, inhale as you lower.",
    mistakes: ["Lifting your chest off the pad", "Shrugging instead of rowing", "Cutting the stretch short"],
    aliases: ["Chest-Supported Row", "Incline Dumbbell Row", "Chest Supported Row"],
  },
  {
    key: "barbell-row", name: "Barbell Row", equipment: "Barbell", muscles: "Upper back, lats",
    steps: [
      "Hold the bar with an overhand grip and hinge forward until your torso is about 45°.",
      "Keep your back flat and knees soft.",
      "Row the bar to your lower ribs.",
      "Lower it under control to straight arms.",
    ],
    breathing: "Brace before each rep, exhale as the bar reaches you.",
    mistakes: ["Standing up as you row", "Rounding the back", "Yanking the bar with momentum"],
    aliases: ["Bent-Over Row", "Bent Over Barbell Row", "Pendlay Row"],
  },
  {
    key: "single-arm-cable-row", name: "Single-Arm Cable Row", equipment: "Seated cable row (single handle)", muscles: "Lats, upper back",
    steps: [
      "Sit at a low cable with a single handle, knees slightly bent.",
      "Start with your arm long and torso tall.",
      "Row the handle to your side, elbow close to the body.",
      "Return slowly until your arm is straight again.",
    ],
    breathing: "Exhale as you row, inhale as you return.",
    mistakes: ["Twisting the torso to pull", "Shrugging", "Rushing the return"],
    aliases: ["One-Arm Cable Row", "Single Arm Cable Row"],
  },
  {
    key: "seated-cable-row", name: "Seated Cable Row", equipment: "Seated cable row (V-handle)", muscles: "Upper back, lats",
    steps: [
      "Sit with feet on the platform and knees slightly bent, holding the V-handle.",
      "Sit tall with arms straight.",
      "Row the handle to your stomach, squeezing your shoulder blades.",
      "Return slowly until your arms are straight.",
    ],
    breathing: "Exhale as you row, inhale as you return.",
    mistakes: ["Rocking back and forth", "Rounding the back on the return", "Elbows flaring out"],
    aliases: ["Cable Row", "Seated Row"],
  },
  // ── Arms ─────────────────────────────────────────────────────────────
  {
    key: "barbell-curl", name: "Barbell Curl", equipment: "Barbell", muscles: "Biceps",
    steps: [
      "Stand with an underhand grip, hands shoulder-width, elbows at your sides.",
      "Curl the bar toward your shoulders without moving your elbows forward.",
      "Squeeze at the top.",
      "Lower slowly to straight arms.",
    ],
    breathing: "Exhale as you curl, inhale as you lower.",
    mistakes: ["Swinging with the hips", "Elbows drifting forward", "Not lowering all the way"],
    aliases: ["Bicep Curl", "Biceps Curl"],
  },
  {
    key: "hammer-curl", name: "Hammer Curl", equipment: "Dumbbells", muscles: "Biceps, forearms",
    steps: [
      "Hold dumbbells at your sides with palms facing in.",
      "Keep elbows at your sides and curl the weights up.",
      "Keep palms facing each other the whole time.",
      "Lower slowly.",
    ],
    breathing: "Exhale as you curl, inhale as you lower.",
    mistakes: ["Swinging the weights", "Elbows moving forward", "Rushing the lowering"],
    aliases: ["Dumbbell Hammer Curl", "Hammer Curls"],
  },
  {
    key: "incline-dumbbell-curl", name: "Incline Dumbbell Curl", equipment: "Dumbbells + incline bench", muscles: "Biceps (long head)",
    steps: [
      "Sit back on a bench set to about 45° with arms hanging straight down.",
      "Curl the weights up without moving your upper arms.",
      "Squeeze at the top.",
      "Lower all the way to a full stretch.",
    ],
    breathing: "Exhale as you curl, inhale as you lower.",
    mistakes: ["Shoulders rolling forward off the bench", "Cutting the stretch short", "Weights too heavy"],
    aliases: ["Incline Curl"],
  },
  {
    key: "rope-triceps-pushdown", name: "Rope Triceps Pushdown", equipment: "Cable + rope", muscles: "Triceps",
    steps: [
      "Hold a rope on a high cable, elbows tucked at your sides.",
      "Push the rope down until your arms are straight, splitting the ends apart at the bottom.",
      "Squeeze your triceps.",
      "Let the rope rise until your forearms are just above parallel.",
    ],
    breathing: "Exhale as you push down, inhale as you return.",
    mistakes: ["Elbows drifting forward", "Leaning over the rope", "Shrugging the shoulders"],
    aliases: ["Triceps Pushdown", "Rope Pushdown", "Tricep Pushdown"],
  },
  {
    key: "overhead-rope-triceps-extension", name: "Overhead Rope Triceps Extension", equipment: "Cable + rope", muscles: "Triceps (long head)",
    steps: [
      "Face away from a cable with the rope held behind your head, elbows pointing forward.",
      "Stagger your stance and brace.",
      "Extend your arms overhead until straight.",
      "Bend your elbows to let the rope back behind your head.",
    ],
    breathing: "Exhale as you extend, inhale as you return.",
    mistakes: ["Elbows flaring wide", "Arching the lower back", "Moving the upper arms"],
    aliases: ["Overhead Triceps Extension", "Cable Overhead Extension"],
  },
  {
    key: "ez-bar-skull-crusher", name: "EZ-Bar Skull Crusher", equipment: "EZ curl bar + flat bench", muscles: "Triceps",
    steps: [
      "Lie on a flat bench holding the EZ bar over your chest, arms straight.",
      "Keeping upper arms still, bend your elbows to lower the bar toward your forehead.",
      "Stop just above your head.",
      "Extend back to straight arms.",
    ],
    breathing: "Inhale as you lower, exhale as you extend.",
    mistakes: ["Elbows flaring out", "Upper arms swinging", "Lowering too fast near the face"],
    aliases: ["Skull Crusher", "Skullcrusher", "Lying Triceps Extension"],
  },
  // ── Core & carries ───────────────────────────────────────────────────
  {
    key: "plank", name: "Plank", equipment: "Bodyweight", muscles: "Core",
    steps: [
      "Set your forearms on the floor, elbows under your shoulders.",
      "Step your feet back so your body is straight from head to heels.",
      "Squeeze your glutes and pull your belly button in.",
      "Hold for the target time.",
    ],
    breathing: "Breathe slowly and steadily. Don't hold your breath.",
    mistakes: ["Hips sagging", "Hips piked too high", "Looking up and straining the neck"],
    aliases: ["Front Plank", "Forearm Plank"],
  },
  {
    key: "side-plank", name: "Side Plank", equipment: "Bodyweight", muscles: "Obliques, core",
    steps: [
      "Lie on your side with your elbow under your shoulder, feet stacked.",
      "Lift your hips so your body is straight from head to feet.",
      "Hold without letting your hips drop.",
      "Repeat on the other side.",
    ],
    breathing: "Breathe slowly and steadily through the hold.",
    mistakes: ["Hips dropping", "Rolling forward or back", "Shoulder shrugged to the ear"],
    aliases: ["Side Bridge"],
  },
  {
    key: "hanging-leg-raise", name: "Hanging Leg Raise", equipment: "Pull-up bar", muscles: "Abs, hip flexors",
    steps: [
      "Hang from a bar with an overhand grip, body still.",
      "Raise your legs by curling your pelvis up, not just lifting from the hips.",
      "Lift until your thighs are at least parallel to the floor.",
      "Lower slowly without swinging.",
    ],
    breathing: "Exhale as you raise, inhale as you lower.",
    mistakes: ["Swinging for momentum", "Dropping the legs fast", "Arching the lower back"],
    aliases: ["Hanging Knee Raise", "Leg Raise"],
  },
  {
    key: "cable-crunch", name: "Cable Crunch", equipment: "Cable + rope", muscles: "Abs",
    steps: [
      "Kneel facing a high cable, holding the rope beside your head.",
      "Keep your hips still.",
      "Crunch down, bringing your elbows toward your thighs by rounding your spine.",
      "Return slowly to the start.",
    ],
    breathing: "Exhale hard as you crunch, inhale as you return.",
    mistakes: ["Sitting the hips back to pull with bodyweight", "Pulling with the arms", "Going too heavy"],
    aliases: ["Kneeling Cable Crunch", "Rope Crunch"],
  },
  {
    key: "pallof-press", name: "Pallof Press", equipment: "Cable (chest height)", muscles: "Core (anti-rotation)",
    steps: [
      "Stand side-on to a cable at chest height, handle held at your sternum.",
      "Step away until the cable pulls you toward the stack.",
      "Press the handle straight out in front of you without letting your torso rotate.",
      "Bring it back to your chest. Switch sides.",
    ],
    breathing: "Exhale as you press out, inhale as you bring it back.",
    mistakes: ["Rotating toward the machine", "Standing too close (no tension)", "Shrugging the shoulders"],
    aliases: ["Cable Pallof Press", "Anti-Rotation Press"],
  },
  {
    key: "farmers-carry", name: "Farmer's Carry", equipment: "Farmer's handles or heavy dumbbells", muscles: "Grip, traps, core",
    steps: [
      "Deadlift the handles up with a flat back.",
      "Stand tall, shoulders down and back.",
      "Walk with short, quick steps for the target distance or time.",
      "Set the weights down by hinging, not rounding.",
    ],
    breathing: "Keep breathing steadily with a light brace. Don't hold your breath the whole walk.",
    mistakes: ["Leaning to one side", "Shoulders rounding forward", "Long overstriding steps"],
    aliases: ["Farmer's Walk", "Farmers Walk", "Farmers Carry"],
  },
  // ── Conditioning ─────────────────────────────────────────────────────
  {
    key: "treadmill-incline-walk", name: "Treadmill Incline Walk", equipment: "Treadmill", muscles: "Conditioning",
    steps: [
      "Start the belt at a slow walk, then set the incline your coach prescribed.",
      "Raise the speed to a brisk pace you can keep for the full time.",
      "Walk tall without holding the handrails.",
      "Lower the incline and speed to cool down for the last 1–2 minutes.",
    ],
    breathing: "Steady breathing through the nose and mouth. You should be able to speak in short sentences.",
    mistakes: ["Holding the rails (cuts the effort a lot)", "Leaning far forward", "Speed too high to sustain"],
    aliases: ["Incline Walk", "Treadmill Walk", "Walking, Treadmill"],
  },
  {
    key: "rowing-machine", name: "Rowing Machine", equipment: "Rowing machine", muscles: "Conditioning, back, legs",
    steps: [
      "Strap your feet in. Start at the catch: shins vertical, arms straight, leaning slightly forward.",
      "Push with your legs first, then lean back slightly, then pull the handle to your lower ribs.",
      "Return in reverse: arms, then body, then legs.",
      "Keep a smooth rhythm: the drive is quick, the return is about twice as slow.",
    ],
    breathing: "Exhale on the drive, inhale on the return.",
    mistakes: ["Pulling with the arms before the legs finish", "Rounding the back", "Rushing the return"],
    aliases: ["Rower", "Rowing", "Erg"],
  },
  {
    key: "stationary-bike", name: "Stationary Bike", equipment: "Stationary bike", muscles: "Conditioning",
    steps: [
      "Set the seat so your knee is slightly bent at the bottom of the pedal stroke.",
      "Start pedalling at an easy resistance.",
      "Increase the resistance or speed to the effort your coach prescribed.",
      "Ease off for the final 1–2 minutes to cool down.",
    ],
    breathing: "Breathe steadily. During hard intervals, take full, deep breaths rather than short gasps.",
    mistakes: ["Seat too low (knee strain)", "Bouncing in the saddle at high speed", "Hunching the shoulders"],
    aliases: ["Exercise Bike", "Bike", "Air Bike", "Assault Bike"],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const byKey = new Map(BUILTIN_DEMOS.map((d) => [d.key, d]));
const byName = new Map<string, BuiltinDemo>();
for (const d of BUILTIN_DEMOS) {
  byName.set(norm(d.name), d);
  for (const a of d.aliases ?? []) if (!byName.has(norm(a))) byName.set(norm(a), d);
}

export function builtinByKey(key: string): BuiltinDemo | undefined {
  return byKey.get(key);
}

export function builtinByName(name: string): BuiltinDemo | undefined {
  return byName.get(norm(name));
}

/** Path to a built-in demo frame (works for the Next app and the static site build). */
export function builtinFrame(key: string, frame: 0 | 1): string {
  const base = typeof window !== "undefined" && window.__LIFTLINE_HASH_ROUTER__ ? "" : "/";
  return `${base}exercises/${key}/${frame}.jpg`;
}

export { norm as normalizeExerciseName };

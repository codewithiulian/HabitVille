# HabitVille

We all know what we should be doing. Go to the gym. Read more. Sleep on time. Put the phone down. The hard part was never knowing, it was doing it consistently, day after day, when nobody's watching and nobody cares.

The current habit trackers don't really do the trick because they feel more like a chore than a game. Heck, some of them are not even games. They all feel the same: a checklist, some streaks, maybe a chart. You check things off for a week, feel good, then forget the app exists. There's no pull. No reason to come back beyond willpower, and willpower is a terrible long-term strategy.

So I'm building Habitville, a habit tracker where your real-life habits build a virtual city.

## The idea

Every habit you complete earns XP and coins. XP levels you up. Coins buy buildings. Your city grows from an empty plot of land into a thriving isometric town, houses, shops, parks, landmarks, all because you showed up and did the work.

Miss a day? Nothing bad happens. You just don't earn anything. No punishment, no guilt trips, no broken streaks that make you want to give up entirely. The city is always there, growing at whatever pace you grow.

It's never about the destination. It's about making the journey fun enough that you actually want to keep going.

## What it looks like

Think SimCity 2000 meets a daily check-in. You open the app, see your city, tap your habits, and watch things come alive. Citizens walk the streets. Cars drive by. Buildings unlock as you level up. The whole thing runs at 60fps in your browser, mobile first, because that's where habits happen.

The check-in takes 10 seconds. Open → tap → done → close. The city is the dashboard. No separate stats page you never visit. Your progress IS the view.

## Tech stack

- **Next.js 16**: App framework with Turbopack
- **PixiJS 8**: 2D WebGL rendering for the isometric game world
- **Zustand**: State management bridging React and PixiJS
- **Dexie.js**: IndexedDB for local-first storage (your data stays on your device)
- **TypeScript**: Strict mode, because future me deserves it

All game assets are from [Penzilla](https://penzilla.itch.io/) — a single artist for visual consistency. Music from [Towball's Crossing](https://towball.itch.io/towballs-crossing) (Animal Crossing vibes). Sound effects from [Shapeforms](https://shapeforms.itch.io/shapeforms-audio-free-sfx).

## Current status

🏗️ **Actively building.** This is a solo side project built in public. I'm working through it in small units over weekends with the goal of having something playable in ~3 months.

Progress is tracked in [ARCHITECTURE.md](./docs/ARCHITECTURE.md) and the implementation roadmap lives in [ACTION_PLAN.md](./ACTION_PLAN.md).

## Why build this in public?

Th motivation behind this project is simple: everyone wants to become a better version of themselves, but doing it is difficult to maintain. So inconsistency is what breaks our good habits. This idea came to me when I've found a random habit tracker online and thought, "Wait, what if I can turn this into a game". I used to love playing SimCity BuildIt, or TribalWars. Building the city/village, leveling up buildings, gathering assets, trading etc. But gave them up because they were eating so much of my time. I'm always conscious of my time. So this combines the best of both worlds: having a SimCity-like game, but for your own habits. You set goals and track habits. The more you do, the more you earn. And the more you earn, the richer your city becomes. Thus your city becomes a reflection of all of your habits.

Another thing I won't implement in this app is streaks and punishments. Sure you can earn bigger bonuses if you're consistent, but the app won't take anything from you if you've missed a day. I remember losing an 120-day streak on HeadSpace, i felt like I never wanted to meditate anymore. This ain't that. What keeps you motivated is the growth of your city, consistency helps build momentum.

So to come back on the original question: I build this in public because I shouldn't be the only one benefiting from something that could improve their lives. So feel free to install it and run it yourself.

## License

TBD: will decide once the project takes shape. For now, feel free to look around, fork i, clone it, run it locally. Currently not accepting PRs or suggestions. This is a passion project built in my already thin spare time, managing contributions would require a much larger attention span which unfortunately I don't have at the moment.

## Credits

Graphics created by Penzilla Design


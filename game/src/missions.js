// The story of Solara Bay: Kai Rook, a new driver in town, works off a debt to
// fixer Lena Voss one job at a time. Six missions, chained in order, each with
// a marker, an objective line, and a cash reward.
import { randomRoadPoint } from './city.js';

export const STORY_INTRO =
  'Kai Rook just rolled into Solara Bay with an empty wallet and a busted ride. ' +
  'Fixer Lena Voss offers a deal: run her jobs, pay off the debt, own the city.';

export function missionList() {
  return [
    {
      id: 'first-fare',
      title: '1 — First Fare',
      giver: 'Lena Voss',
      brief: 'A client needs a ride across town. Pick up the passenger at the yellow marker, then drop them at the green marker. Drive like you mean it.',
      reward: 150,
      steps: ['pickup', 'dropoff'],
    },
    {
      id: 'hot-package',
      title: '2 — Hot Package',
      giver: 'Lena Voss',
      brief: 'A package is waiting at the docks. Grab it — but the boys in blue already got a tip. Expect heat. Deliver it to the Palm Court garage.',
      reward: 300,
      steps: ['pickup', 'dropoff'],
      wantedOnPickup: 2,
    },
    {
      id: 'getaway',
      title: '3 — The Getaway',
      giver: 'Marcus "Doc" Hale',
      brief: 'Doc\'s crew hit a warehouse and the whole city is lit up. Get to the hideout marker, then shake the cops completely — lose every star.',
      reward: 450,
      steps: ['reach', 'loseCops'],
      wantedAtStart: 3,
    },
    {
      id: 'debt-collection',
      title: '4 — Debt Collection',
      giver: 'Lena Voss',
      brief: 'Three deadbeats owe Lena money and they are hanging around Old Town. On foot. Make them pay — punch or shoot, your call — then grab the cash they drop.',
      reward: 500,
      steps: ['beat', 'collect'],
      thugs: 3,
    },
    {
      id: 'sunset-run',
      title: '5 — Sunset Run',
      giver: 'Rosa Delgado',
      brief: 'Rosa\'s courier van broke down and her sunset delivery has to cross the whole city before the light dies. 150 seconds. No excuses.',
      reward: 650,
      steps: ['pickup', 'dropoff'],
      timeLimit: 150,
    },
    {
      id: 'big-score',
      title: '6 — The Big Score',
      giver: 'Lena Voss',
      brief: 'One last job and the debt is gone. A Coral GT — cherry red, parked in Coral Heights — belongs to a collector who skipped town. Take it, lose the heat, and bring it to the garage. Then Solara Bay is yours.',
      reward: 1200,
      steps: ['steal', 'deliver'],
      wantedOnPickup: 3,
    },
  ];
}

// A mission instance: resolved marker points, live step state, timers.
export function startMission(def, rand, playerPos) {
  const mission = {
    def,
    stepIndex: 0,
    marker: null,
    pickupPoint: null,
    dropoffPoint: null,
    timer: def.timeLimit || 0,
    collected: 0,
    needed: def.thugs || 0,
    thugsSpawned: false,
    done: false,
    failed: false,
    message: '',
  };
  const far = (min) => randomRoadPoint(rand, playerPos.x, playerPos.y, min);
  if (def.id === 'big-score') {
    mission.stealPoint = far(900);
    mission.dropoffPoint = far(700);
    mission.marker = mission.stealPoint;
    mission.message = 'Steal the Coral GT at the marker';
  } else if (def.id === 'getaway') {
    mission.marker = far(800);
    mission.message = 'Reach the hideout marker';
  } else if (def.id === 'debt-collection') {
    mission.marker = far(500);
    mission.message = 'Find the deadbeats in Old Town';
  } else {
    mission.pickupPoint = far(600);
    mission.dropoffPoint = far(900);
    mission.marker = mission.pickupPoint;
    mission.message = 'Go to the pickup marker';
  }
  return mission;
}

export function currentStep(mission) {
  return mission.def.steps[mission.stepIndex];
}

export function objectiveText(mission) {
  if (!mission) return 'No job right now — visit Lena (press M for the next job)';
  if (mission.done) return 'Job complete! Press M for the next job';
  const step = currentStep(mission);
  switch (step) {
    case 'pickup': return 'Pick up at the yellow marker';
    case 'dropoff': return 'Deliver to the green marker';
    case 'reach': return 'Reach the hideout marker';
    case 'loseCops': return 'Lose the cops — drop every star!';
    case 'beat': return `Deal with the deadbeats (${mission.collected}/${mission.needed})`;
    case 'collect': return 'Collect the dropped cash';
    case 'steal': return 'Steal the Coral GT at the marker';
    case 'deliver': return 'Deliver the Coral GT to the garage';
    default: return mission.message;
  }
}

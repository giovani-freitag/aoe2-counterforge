# How the economy is calculated

<p align="center">
  <img src="screenshots/economy-mobile.png" alt="Economy tab: gather technologies by age, and villagers per resource" width="300">
</p>

The question the tab answers is: to keep this unit coming out of its building without a pause, how
many villagers do you need, and on what?

Consumption per second is the unit cost times the number of production buildings, divided by its
train time. Villagers per resource is that consumption divided by the gather rate.

## The gather rate is a trip, not a constant

The published Definitive Edition rates already include walking to the drop-off point, so the app
works backwards: knowing the carry capacity (10) and the villager's walking speed (0.8 tiles/s), it
separates how much of a trip is gathering from how much is walking. That is what lets every upgrade
land where it actually acts:

- **Gathering** (Double-Bit Axe, Bow Saw, Two-Man Saw, Gold and Stone Mining) multiplies the work
  rate, by exactly the percentage the game states.
- **Carrying** (Wheelbarrow, Hand Cart) raises capacity and walking speed; the resulting gain works
  out to around 8% and 18%, with no invented numbers.
- **Heavy Plow** adds +1 to the carry capacity of farmers only.
- **Farm upgrades** (Horse Collar, Heavy Plow, Crop Rotation) raise the food per farm, which the app
  uses to work out the **wood spent rebuilding farms** — a Knight costs no wood, but producing
  Knights non-stop still needs lumberjacks.

Conscription can be toggled on, cutting the train time by 33%.

The result is shown as a whole number of villagers per resource, with the exact figure beside it,
plus the bottleneck: the resource that runs out first and therefore sets the pace.

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const productNames = [
  'Triangular tostadas 200 g',
  'Triangular tostadas 500 g',
  'Round chips 200 g',
  'Round chips 500 g',
  'Crunchy corn sticks 100 g',
  'Crunchy corn sticks 150 g',
];

const flourPerUnit = [0.0957, 0.2394, 0.0957, 0.2394, 0.0714, 0.1071];
const doughPerUnit = [0.1915, 0.4787, 0.1915, 0.4787, 0.0, 0.0];
const timePerUnit = [0.0170, 0.0426, 0.0170, 0.0426, 0.0095, 0.0143];

const saltPerUnit = [0.002617, 0.006543, 0.002617, 0.006543, 0.001857, 0.002786];
const waterPerUnit = [0.047872, 0.119681, 0.047872, 0.119681, 0.1, 0.15];
const oilPerUnit = [0.042553, 0.106383, 0.042553, 0.106383, 0.017857, 0.026786];
const sesamePerUnit = [0, 0, 0, 0, 0.004286, 0.006429];
const starchPerUnit = [0, 0, 0, 0, 0.003571, 0.005357];
const coloringPerUnit = [0.00043, 0.001074, 0.00043, 0.001074, 0, 0];

const defaultRows = productNames.map((name, i) => ({
  name,
  profit: [20, 35, 18, 32, 15, 22][i],
  dmin: [20, 15, 30, 20, 25, 20][i],
  dmax: [100, 80, 120, 90, 110, 95][i],
}));

const defaultResources = { flour: 200, dough: 400, time: 30 };

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumProduct(x, coeffs) {
  return x.reduce((acc, val, i) => acc + val * coeffs[i], 0);
}

function cloneRows(rows) {
  return rows.map((r) => ({ ...r }));
}

function ScenarioEditor({ title, rows, setRows, resources, setResources }) {
  const updateRow = (idx, key, value) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-auto rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Min demand</TableHead>
                <TableHead>Max demand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.name}>
                  <TableCell className="min-w-[220px] font-medium">{row.name}</TableCell>
                  <TableCell><Input type="number" value={row.profit} onChange={(e) => updateRow(idx, 'profit', e.target.value)} /></TableCell>
                  <TableCell><Input type="number" value={row.dmin} onChange={(e) => updateRow(idx, 'dmin', e.target.value)} /></TableCell>
                  <TableCell><Input type="number" value={row.dmax} onChange={(e) => updateRow(idx, 'dmax', e.target.value)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Total flour (kg)</label>
            <Input type="number" value={resources.flour} onChange={(e) => setResources({ ...resources, flour: e.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Total dough (kg)</label>
            <Input type="number" value={resources.dough} onChange={(e) => setResources({ ...resources, dough: e.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Total time (hours)</label>
            <Input type="number" value={resources.time} onChange={(e) => setResources({ ...resources, time: e.target.value })} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function App() {
  const [rowsA, setRowsA] = useState(cloneRows(defaultRows));
  const [rowsB, setRowsB] = useState(cloneRows(defaultRows));
  const [resourcesA, setResourcesA] = useState({ ...defaultResources });
  const [resourcesB, setResourcesB] = useState({ ...defaultResources, flour: 180, dough: 360, time: 28 });
  const [historyA, setHistoryA] = useState([]);
  const [historyB, setHistoryB] = useState([]);
  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);
  const [status, setStatus] = useState('Ready');

  const fixedPreview = useMemo(() => (
    productNames.map((name, i) => ({
      name,
      flour: flourPerUnit[i],
      dough: doughPerUnit[i],
      time: timePerUnit[i],
    }))
  ), []);

  const isFeasible = (x, dmins, dmaxs, flourTotal, doughTotal, timeTotal) => {
    for (let i = 0; i < x.length; i++) {
      if (x[i] < dmins[i] || x[i] > dmaxs[i]) return false;
    }
    if (sumProduct(x, flourPerUnit) > flourTotal) return false;
    if (sumProduct(x, doughPerUnit) > doughTotal) return false;
    if (sumProduct(x, timePerUnit) > timeTotal) return false;
    return true;
  };

  const totalProfit = (x, profits) => x.reduce((acc, v, i) => acc + v * profits[i], 0);

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const createFeasibleSolution = (dmins, dmaxs, flourTotal, doughTotal, timeTotal) => {
    for (let attempt = 0; attempt < 10000; attempt++) {
      const candidate = dmins.map((mn, i) => randomInt(mn, dmaxs[i]));
      if (isFeasible(candidate, dmins, dmaxs, flourTotal, doughTotal, timeTotal)) return candidate;
    }
    return null;
  };

  const repairSolution = (x, profits, dmins, dmaxs, flourTotal, doughTotal, timeTotal) => {
    const repaired = [...x];
    for (let i = 0; i < repaired.length; i++) {
      repaired[i] = Math.max(dmins[i], Math.min(dmaxs[i], repaired[i]));
    }
    const order = [...profits.keys()].sort((a, b) => profits[a] - profits[b]);
    let guard = 0;
    while (!isFeasible(repaired, dmins, dmaxs, flourTotal, doughTotal, timeTotal) && guard < 10000) {
      let changed = false;
      for (const i of order) {
        if (repaired[i] > dmins[i]) {
          repaired[i] -= 1;
          changed = true;
          if (isFeasible(repaired, dmins, dmaxs, flourTotal, doughTotal, timeTotal)) return repaired;
        }
      }
      if (!changed) break;
      guard += 1;
    }
    return repaired;
  };

  const runScenario = (rows, resources) => {
    const profits = rows.map(r => toNumber(r.profit));
    const dmins = rows.map(r => Math.max(0, Math.floor(toNumber(r.dmin))));
    const dmaxs = rows.map(r => Math.max(Math.floor(toNumber(r.dmax)), Math.floor(toNumber(r.dmin))));
    const flourTotal = toNumber(resources.flour);
    const doughTotal = toNumber(resources.dough);
    const timeTotal = toNumber(resources.time);

    const POP_SIZE = 60;
    const GENERATIONS = 120;
    const CROSSOVER_RATE = 0.85;
    const MUTATION_RATE = 0.2;
    const TOURNAMENT_SIZE = 3;
    const ELITE_SIZE = 2;

    let population = [];
    while (population.length < POP_SIZE) {
      const candidate = createFeasibleSolution(dmins, dmaxs, flourTotal, doughTotal, timeTotal);
      if (!candidate) break;
      population.push(candidate);
    }

    if (population.length === 0) {
      return { error: 'No feasible initial solution. Lower minimum demand or increase resources.' };
    }

    const fitness = (x) => {
      if (!isFeasible(x, dmins, dmaxs, flourTotal, doughTotal, timeTotal)) return -1e12;
      return totalProfit(x, profits);
    };

    const tournamentSelection = () => {
      const candidates = [];
      for (let i = 0; i < TOURNAMENT_SIZE; i++) {
        candidates.push(population[randomInt(0, population.length - 1)]);
      }
      candidates.sort((a, b) => fitness(b) - fitness(a));
      return [...candidates[0]];
    };

    const crossover = (p1, p2) => {
      const point = randomInt(1, p1.length - 1);
      return [
        [...p1.slice(0, point), ...p2.slice(point)],
        [...p2.slice(0, point), ...p1.slice(point)],
      ];
    };

    const mutate = (ind) => {
      const child = [...ind];
      for (let i = 0; i < child.length; i++) {
        if (Math.random() < MUTATION_RATE) child[i] += randomInt(-10, 10);
      }
      return child.map((v, i) => Math.max(dmins[i], Math.min(dmaxs[i], v)));
    };

    let firstBest = [...population].sort((a, b) => fitness(b) - fitness(a))[0];
    let best = [...firstBest];
    let historyData = [];

    for (let gen = 0; gen < GENERATIONS; gen++) {
      population.sort((a, b) => fitness(b) - fitness(a));
      if (fitness(population[0]) > fitness(best)) best = [...population[0]];
      historyData.push({ generation: gen + 1, bestFitness: fitness(population[0]) });

      let newPopulation = population.slice(0, ELITE_SIZE).map(ind => [...ind]);

      while (newPopulation.length < POP_SIZE) {
        const parent1 = tournamentSelection();
        const parent2 = tournamentSelection();
        let child1, child2;
        if (Math.random() < CROSSOVER_RATE) {
          [child1, child2] = crossover(parent1, parent2);
        } else {
          child1 = [...parent1];
          child2 = [...parent2];
        }

        child1 = repairSolution(mutate(child1), profits, dmins, dmaxs, flourTotal, doughTotal, timeTotal);
        child2 = repairSolution(mutate(child2), profits, dmins, dmaxs, flourTotal, doughTotal, timeTotal);

        if (isFeasible(child1, dmins, dmaxs, flourTotal, doughTotal, timeTotal)) newPopulation.push(child1);
        if (newPopulation.length < POP_SIZE && isFeasible(child2, dmins, dmaxs, flourTotal, doughTotal, timeTotal)) newPopulation.push(child2);

        while (newPopulation.length < POP_SIZE) {
          const candidate = createFeasibleSolution(dmins, dmaxs, flourTotal, doughTotal, timeTotal);
          if (!candidate) break;
          newPopulation.push(candidate);
        }
      }
      population = newPopulation.slice(0, POP_SIZE);
    }

    const finalProfit = totalProfit(best, profits);
    const firstProfit = totalProfit(firstBest, profits);

    return {
      solution: best,
      firstSolution: firstBest,
      firstProfit,
      finalProfit,
      flourUsed: sumProduct(best, flourPerUnit),
      doughUsed: sumProduct(best, doughPerUnit),
      timeUsed: sumProduct(best, timePerUnit),
      saltUsed: sumProduct(best, saltPerUnit),
      waterUsed: sumProduct(best, waterPerUnit),
      oilUsed: sumProduct(best, oilPerUnit),
      sesameUsed: sumProduct(best, sesamePerUnit),
      starchUsed: sumProduct(best, starchPerUnit),
      coloringUsed: sumProduct(best, coloringPerUnit),
      feasible: isFeasible(best, dmins, dmaxs, flourTotal, doughTotal, timeTotal),
      improvement: finalProfit - firstProfit,
      history: historyData,
      profits,
      dmins,
      dmaxs,
      resources: { flourTotal, doughTotal, timeTotal },
    };
  };

  const buildRecommendations = (result, label) => {
    if (!result || result.error) return [];
    const recs = [];
    const { solution, profits, dmins, dmaxs, resources } = result;
    const flourSlack = resources.flourTotal - result.flourUsed;
    const doughSlack = resources.doughTotal - result.doughUsed;
    const timeSlack = resources.timeTotal - result.timeUsed;

    if (flourSlack < resources.flourTotal * 0.05) recs.push(`${label}: flour is almost fully used, so it is likely a critical resource this week.`);
    if (doughSlack < resources.doughTotal * 0.05) recs.push(`${label}: dough is almost fully used, so increasing dough availability could improve the plan.`);
    if (timeSlack < resources.timeTotal * 0.05) recs.push(`${label}: production time is tight, so overtime or shift balancing may increase output.`);

    const highestProfitIndex = profits.indexOf(Math.max(...profits));
    if (solution[highestProfitIndex] === dmaxs[highestProfitIndex]) {
      recs.push(`${label}: ${productNames[highestProfitIndex]} reached its maximum demand, which suggests it is one of the most attractive products this week.`);
    }

    const minOnly = solution
      .map((v, i) => ({ i, v }))
      .filter(({ i, v }) => v === dmins[i]);
    if (minOnly.length > 0) {
      recs.push(`${label}: ${minOnly.map(({ i }) => productNames[i]).join(', ')} stayed at minimum production, so they contribute less relative to current resource conditions.`);
    }

    const topProdIdx = solution.indexOf(Math.max(...solution));
    recs.push(`${label}: the model recommends focusing more on ${productNames[topProdIdx]} under the current weekly conditions.`);

    return recs;
  };

  const runBoth = () => {
    setStatus('Running...');
    const a = runScenario(rowsA, resourcesA);
    const b = runScenario(rowsB, resourcesB);

    setResultA(a.error ? null : a);
    setResultB(b.error ? null : b);
    setHistoryA(a.error ? [] : a.history);
    setHistoryB(b.error ? [] : b.history);

    if (a.error || b.error) {
      setStatus(a.error || b.error);
    } else {
      setStatus('Done');
    }
  };

  const comparisonData = useMemo(() => {
    if (!resultA || !resultB) return [];
    return productNames.map((name, i) => ({
      name,
      scenarioA: resultA.solution[i],
      scenarioB: resultB.solution[i],
    }));
  }, [resultA, resultB]);

  const recommendations = useMemo(() => ([
    ...buildRecommendations(resultA, 'Scenario A'),
    ...buildRecommendations(resultB, 'Scenario B'),
  ]), [resultA, resultB]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Planning App</h1>
          <p className="mt-2 text-sm text-slate-600">
            Compare Scenario A vs Scenario B and get automatic weekly recommendations.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="a" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="a">Scenario A</TabsTrigger>
                <TabsTrigger value="b">Scenario B</TabsTrigger>
              </TabsList>
              <TabsContent value="a" className="mt-4">
                <ScenarioEditor title="Scenario A inputs" rows={rowsA} setRows={setRowsA} resources={resourcesA} setResources={setResourcesA} />
              </TabsContent>
              <TabsContent value="b" className="mt-4">
                <ScenarioEditor title="Scenario B inputs" rows={rowsB} setRows={setRowsB} resources={resourcesB} setResources={setResourcesB} />
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-3">
              <Button onClick={runBoth} className="rounded-2xl">Run Scenario A vs B</Button>
              <Badge variant="secondary">{status}</Badge>
            </div>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Fixed coefficients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Flour</TableHead>
                      <TableHead>Dough</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedPreview.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="text-xs font-medium">{row.name}</TableCell>
                        <TableCell>{row.flour.toFixed(4)}</TableCell>
                        <TableCell>{row.dough.toFixed(4)}</TableCell>
                        <TableCell>{row.time.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {resultA && resultB && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              {[['Scenario A', resultA], ['Scenario B', resultB]].map(([label, result]) => (
                <Card key={label} className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle>{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-slate-500">Initial best profit</div>
                        <div className="text-2xl font-semibold">{result.firstProfit.toFixed(2)}</div>
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-slate-500">Final best profit</div>
                        <div className="text-2xl font-semibold">{result.finalProfit.toFixed(2)}</div>
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-slate-500">Improvement</div>
                        <div className="text-2xl font-semibold">{result.improvement.toFixed(2)}</div>
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-slate-500">Feasible</div>
                        <div className="text-2xl font-semibold">{result.feasible ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    <div className="overflow-auto rounded-xl border bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Bags</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productNames.map((name, i) => (
                            <TableRow key={name}>
                              <TableCell>{name}</TableCell>
                              <TableCell>{result.solution[i]}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Scenario comparison by product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" height={90} interval={0} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="scenarioA" name="Scenario A" />
                      <Bar dataKey="scenarioB" name="Scenario B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Fitness trend - Scenario A</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyA}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="generation" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="bestFitness" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Fitness trend - Scenario B</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyB}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="generation" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="bestFitness" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Automatic recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="rounded-xl border bg-white p-4 text-sm text-slate-700">
                      {rec}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {[['Scenario A', resultA], ['Scenario B', resultB]].map(([label, result]) => (
                <Card key={`${label}-ingredients`} className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle>{label} additional ingredient requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto rounded-xl border bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingredient</TableHead>
                            <TableHead>Requirement</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow><TableCell>Salt</TableCell><TableCell>{result.saltUsed.toFixed(4)} kg</TableCell></TableRow>
                          <TableRow><TableCell>Water</TableCell><TableCell>{result.waterUsed.toFixed(4)} L</TableCell></TableRow>
                          <TableRow><TableCell>Oil</TableCell><TableCell>{result.oilUsed.toFixed(4)} L</TableCell></TableRow>
                          <TableRow><TableCell>Sesame</TableCell><TableCell>{result.sesameUsed.toFixed(4)} kg</TableCell></TableRow>
                          <TableRow><TableCell>Starch</TableCell><TableCell>{result.starchUsed.toFixed(4)} kg</TableCell></TableRow>
                          <TableRow><TableCell>Coloring</TableCell><TableCell>{result.coloringUsed.toFixed(4)} kg</TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

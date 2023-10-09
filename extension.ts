#!/usr/bin/env deno run -A --ext=ts

if (Deno.args.length === 0) {
  const manifest = {
    title: "Kill Process",
    commands: [
      { name: "list-processes", title: "List Active Process", "mode": "view" },
      {
        name: "kill-process",
        title: "Kill Process",
        "mode": "no-view",
        params: [
          { name: "pid", type: "number", required: true },
        ],
      },
    ],
  };

  console.log(JSON.stringify(manifest));
  Deno.exit(0);
}

import $ from "https://deno.land/x/dax/mod.ts";
import { toJson } from "https://deno.land/std@0.203.0/streams/mod.ts";

if (Deno.args[0] === "list-processes") {
  const stdout = await $`ps -eo pid,ppid,pcpu,rss,comm`.text();
  const processes = stdout.split("\n").map((line) => {
    const defaultValue = ["", "", "", "", "", ""];
    const regex = /(\d+)\s+(\d+)\s+(\d+[.|,]\d+)\s+(\d+)\s+(.*)/;
    const [, id, pid, cpu, mem, path] = line.match(regex) ?? defaultValue;
    const processName = path.match(/[^/]*[^/]*$/i)?.[0] ?? "";
    const isPrefPane = path.includes(".prefPane");
    const isApp = path.includes(".app/");

    return {
      id: parseInt(id),
      pid: parseInt(pid),
      cpu: parseFloat(cpu),
      mem: parseInt(mem),
      type: isPrefPane ? "prefPane" : isApp ? "app" : "binary",
      path,
      processName,
    };
  }).filter((process) => process.processName !== "").sort((a, b) =>
    b.cpu - a.cpu
  );

  const page = {
    type: "list",
    items: processes.map((process) => ({
      title: process.processName,
      subtitle: process.pid.toString(),
      accessories: [process.cpu.toString()],
      actions: [{
        title: "Kill",
        onAction: {
          type: "run",
          command: "kill-process",
          params: { pid: process.pid },
        },
      }],
    })),
  };

  console.log(JSON.stringify(page));
} else if (Deno.args[0] === "kill-process") {
  const { params } = await toJson(Deno.stdin.readable) as {
    params: { pid: number };
  };

  await $`kill ${params.pid}`;
  console.log(JSON.stringify({ type: "reload" }));
}

import { useEffect, useState } from "react";

import {
  fetchExercises,
  fetchExpressions,
  fetchHomework,
  fetchMaterials,
} from "../api";
import type { Exercise, Expression, Homework, Level, Material, Stream } from "../types";

type Params = {
  studentEmail: string;
  stream: Stream;
  currentLevel: Level;
};

export const useLearningContent = ({
  studentEmail,
  stream,
  currentLevel,
}: Params) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expressions, setExpressions] = useState<Expression[]>([]);

  useEffect(() => {
    const params = {
      student_email: studentEmail || undefined,
      stream,
      level: currentLevel,
    };
    fetchMaterials(params).then(setMaterials).catch(() => setMaterials([]));
    fetchHomework(params).then(setHomework).catch(() => setHomework([]));
    fetchExercises(params).then(setExercises).catch(() => setExercises([]));
    fetchExpressions(params).then(setExpressions).catch(() => setExpressions([]));
  }, [stream, currentLevel, studentEmail]);

  return {
    materials,
    homework,
    exercises,
    expressions,
  };
};

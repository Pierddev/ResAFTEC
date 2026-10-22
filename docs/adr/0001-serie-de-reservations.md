# Une Série de réservations est enregistrée, ses Occurrences en échec ne le sont pas

Pour la réservation récurrente, on enregistre une **Série** (Salle principale, jour de la semaine, Créneau, Plage de semaines, titre, créateur, Bénéficiaire). Chaque Réservation qui en découle garde un lien optionnel vers elle. On aurait pu se contenter de créer N Réservations sans lien entre elles, mais on aurait perdu la trace de la récurrence : impossible d'annuler la Série en entier, ou de savoir combien d'Occurrences ont été obtenues.

## Conséquences

- **La Série est enregistrée même si toutes ses Occurrences échouent.** Le Formateur peut ainsi réserver les dates dans une Salle de remplacement et les rattacher à la même Série. On accepte qu'il reste des Séries vides si le Formateur abandonne.
- **Une Réservation de la Série peut être dans une autre Salle que la Salle principale.** La Salle de la Réservation fait foi : celle de la Série indique seulement le choix de départ.
- **Les Occurrences en échec ne sont pas enregistrées.** Elles n'apparaissent que dans le Rapport de Série. Si on en a besoin plus tard, on peut les recalculer à partir des paramètres de la Série.
- **Les Occurrences sont calculées à l'heure de Paris** (fuseau Europe/Paris), pour qu'un cours de 10h-12h reste à 10h-12h après le changement d'heure.
- **Le lien parent/enfant entre Salles (C100 ⊃ C101, C102) n'est pas pris en compte** pour détecter une Indisponibilité, comme pour la réservation simple. C'est un trou connu, à corriger pour les deux types de réservation en même temps.

# ResAFTEC

Réservation des salles de l'établissement AFTEC par le personnel, consultation par les étudiants.

## Personnes

**Formateur** :
Personne qui anime des cours et peut réserver des salles pour elle-même.
_À éviter_ : Professeur, Enseignant

**Administrateur** :
Personne qui gère l'établissement et peut réserver une salle pour n'importe quel Bénéficiaire.
_À éviter_ : Admin, Gestionnaire

**Bénéficiaire** :
Personne pour qui une Réservation est faite. Elle peut être différente de la personne qui l'a créée.

## Réservation

**Salle** :
Espace réservable d'un étage. Une salle peut en contenir d'autres (ex. : C100 regroupe C101 et C102).
_À éviter_ : Classe, Local

**Créneau** :
Plage horaire d'une même journée, définie par une heure de début et une heure de fin, à l'heure de Paris.
_À éviter_ : Horaire, Slot

**Réservation** :
Occupation d'une Salle sur un Créneau à une date précise, au profit d'un Bénéficiaire.
_À éviter_ : Booking, Résa

**Désactivation** :
Période pendant laquelle une Salle ne peut pas être réservée (travaux, panne…).
_À éviter_ : Fermeture, Blocage

**Indisponibilité** :
Situation d'une Salle qui, à une date et un Créneau donnés, chevauche (même partiellement) une Réservation existante ou une Désactivation.
_À éviter_ : Conflit (sauf pour désigner le chevauchement lui-même)

## Récurrence

**Série** :
Demande de réservation répétée chaque semaine : une Salle, un jour de la semaine, un Créneau et une Plage de semaines.
_À éviter_ : Récurrence, Réservation récurrente (pour désigner l'objet)

**Salle principale** :
Salle choisie au moment de créer la Série. Les Occurrences y sont réservées en priorité.

**Salle de remplacement** :
Autre Salle choisie par le Formateur pour une Occurrence en échec, sur le même Créneau. La Réservation obtenue fait toujours partie de la Série.
_À éviter_ : Salle alternative, Salle de secours

**Plage de semaines** :
Ensemble de semaines ISO consécutives, de la semaine de début à la semaine de fin incluses. Elle peut passer d'une année à l'autre.
_À éviter_ : Période

**Occurrence** :
Une date de la Série, c'est-à-dire le jour choisi dans l'une des semaines de la Plage. Une Occurrence libre donne une Réservation ; une Occurrence en Indisponibilité est une Occurrence en échec.

**Occurrence en échec** :
Occurrence qui n'a pas pu être réservée à cause d'une Indisponibilité de la Salle.
_À éviter_ : Date refusée, Conflit

**Rapport de Série** :
Retour affiché au Formateur après une demande : les Occurrences réservées et chaque Occurrence en échec avec son motif (déjà réservée ou salle désactivée).
_À éviter_ : Notification

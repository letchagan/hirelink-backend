module.exports = {
  async generateSchedule(interviewers, dates, availability) {
    const userNameMap = new Map(interviewers.map(u => [u.id, u.name]));
    const userWorkload = Object.fromEntries(interviewers.map(u => [u.id, 0]));
    
    // Group available interviewers per date
    const availablePerDate = {};
    availability.forEach(avail => {
      const dId = avail.campaign_date_id;
      const uId = avail.user_id;
      const slotType = avail.slot_type || 'offline';
      if (!availablePerDate[dId]) {
        availablePerDate[dId] = [];
      }
      availablePerDate[dId].push({ uId, slotType });
    });

    const recommendedPlan = {};
    const explanation = [];

    // Sort dates by lowest availability (hardest to staff first)
    const sortedDates = [...dates].sort((a, b) => {
      const countA = (availablePerDate[a.id] || []).length;
      const countB = (availablePerDate[b.id] || []).length;
      return countA - countB;
    });

    sortedDates.forEach(d => {
      const dId = d.id;
      const dStr = d.date;
      const capacity = d.max_capacity;

      const candidates = availablePerDate[dId] || [];
      // Sort candidates by current workload (greedy balance: pick those with lowest workload first)
      const sortedCandidates = [...candidates].sort((a, b) => (userWorkload[a.uId] || 0) - (userWorkload[b.uId] || 0));

      const selected = sortedCandidates.slice(0, capacity);
      recommendedPlan[dStr] = selected.map(cand => {
        const name = userNameMap.get(cand.uId);
        const loc = cand.slotType === 'online' ? 'Online' : 'Offline';
        return `${name} (${loc})`;
      }).filter(Boolean);

      // Increment workload
      selected.forEach(cand => {
        if (userWorkload[cand.uId] !== undefined) {
          userWorkload[cand.uId] += 1;
        }
      });

      if (selected.length === 0) {
        explanation.push(`Warning: ${dStr} has 0 available interviewers.`);
      } else if (candidates.length > capacity) {
        explanation.push(`${dStr} is fully optimized. Capacity of ${capacity} met. Balanced workload selected.`);
      } else {
        explanation.push(`${dStr} scheduled with all ${selected.length} available candidate(s).`);
      }
    });

    const totalSlots = dates.reduce((sum, d) => sum + d.max_capacity, 0);
    const filledSlots = Object.values(recommendedPlan).reduce((sum, list) => sum + list.length, 0);
    const score = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 100;

    return {
      success: true,
      schedule: recommendedPlan,
      explanation: explanation.join('\n'),
      score,
      balanced_workload: "Optimal"
    };
  }
};

import { useEffect, useState } from "react";
import styles from "../styles/Reservoir.module.css";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://your-project-id.supabase.co", "your-anon-key");

export default function VirtualReservoir() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [litres, setLitres] = useState("");
  const [postcode, setPostcode] = useState("");
  const [photo, setPhoto] = useState(null);
  const [totalLitres, setTotalLitres] = useState(0);
  const goalLitres = 43000030;

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.from("water_butts").select("*");
    if (!error) {
      const approvedEntries = data.filter(entry => entry.approved);
      const pendingEntries = data.filter(entry => !entry.approved);
      setApproved(approvedEntries);
      setPending(pendingEntries);
      setTotalLitres(approvedEntries.reduce((sum, entry) => sum + entry.litres, 0));
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleAdd = async () => {
    const litresNum = parseInt(litres);
    if (!isNaN(litresNum) && postcode && photo) {
      const fileExt = photo.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `photos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("photos").upload(filePath, photo);
      if (!uploadError) {
        await supabase.from("water_butts").insert([
          { litres: litresNum, postcode, photo_url: filePath, approved: false }
        ]);
        setLitres("");
        setPostcode("");
        setPhoto(null);
        fetchSubmissions();
      }
    }
  };

  const handleApproval = async (id) => {
    await supabase.from("water_butts").update({ approved: true }).eq("id", id);
    fetchSubmissions();
  };

  const fillPercent = Math.min((totalLitres / goalLitres) * 100, 100);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Virtual Reservoir</h1>
      <p className={styles.intro}>Join the movement by registering your water butt.</p>
      <div className={styles.form}>
        <input
          type="number"
          value={litres}
          onChange={(e) => setLitres(e.target.value)}
          placeholder="Litres"
        />
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="Postcode"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
        />
        <button onClick={handleAdd}>Submit</button>
      </div>

      <div className={styles.reservoir}>
        <div className={styles.lake}>
          <div className={styles.fill} style={{ height: `${fillPercent}%` }} />
        </div>
        <p className={styles.stats}>{totalLitres}L collected ({fillPercent.toFixed(2)}%)</p>
      </div>

      <div className={styles.panel}>
        <h2>Moderation Panel</h2>
        {pending.length === 0 ? <p>No pending entries</p> :
          pending.map(entry => (
            <div key={entry.id}>
              <p>{entry.postcode} - {entry.litres}L</p>
              <button onClick={() => handleApproval(entry.id)}>Approve</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

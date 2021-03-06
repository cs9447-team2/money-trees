import { useEffect, useState } from 'react';

import { getVulns } from '../../services/vulnerabilities';

import {
  Typography,
  Select,
  MenuItem,
  Input,
  Grid,
  Box,
  Divider,
  ListItem,
  TextField,
  Slider,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import SeverityIcon from '../Global/SeverityIcon';
import { List } from '@mui/icons-material';

const marks = [
  {
    value: 1,
    label: (
      <div style={{ display: 'flex', alignContent: 'center' }}>
        <SeverityIcon severityLevel={1} />
        <Typography>Low</Typography>
      </div>
    ),
  },
  {
    value: 2,
    label: (
      <div style={{ display: 'flex', alignContent: 'center' }}>
        <SeverityIcon severityLevel={2} />
        <Typography>Medium</Typography>
      </div>
    ),
  },
  {
    value: 3,
    label: (
      <div style={{ display: 'flex', alignContent: 'center' }}>
        <SeverityIcon severityLevel={3} />
        <Typography>High</Typography>
      </div>
    ),
  },
  {
    value: 4,
    label: (
      <div style={{ display: 'flex', alignContent: 'center' }}>
        <SeverityIcon severityLevel={4} />
        <Typography>Critical</Typography>
      </div>
    ),
  },
];

export const StepTwo = (props: {
  isNewVuln: boolean;
  setFormData: any;
  formData: any;
}) => {
  const [vulnData, setVulnData] = useState<any[]>([]);
  const [selectedVuln, setSelectedVuln] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!props.isNewVuln) {
      getVulns()
        .then((response: any) => {
          setVulnData(response.data);
          setLoading(false);
        })
        .catch((err: any) => {
          console.log(err);
          throw new Error('Unable to get vuln data.');
        });
    }
  }, [props.isNewVuln]);

  const handleChange = (e: any, value: any) => {
    console.log(value.id);
    props.formData.vulnId = value.id;
    props.setFormData(props.formData);
    setSelectedVuln(value.id);
  };

  const handleSeverityChange = (e: any) => {
    props.formData.severity = e.target.value;
    props.setFormData(props.formData);
    setSelectedVuln(e.target.value);
  };

  const handleNameChange = (e: any) => {
    props.formData.name = e.target.value;
    props.setFormData(props.formData);
    console.log(props.formData);
    setSelectedVuln(e.target.value);
  };

  const handleDescriptionChange = (e: any) => {
    props.formData.description = e.target.value;
    props.setFormData(props.formData);
    setSelectedVuln(e.target.value);
  };

  return (
    <div>
      {props.isNewVuln ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ pl: 10, pt: 5, pr: 10, pb: 3 }}>
            <Typography> CVE name: </Typography>
            <TextField onChange={handleNameChange} fullWidth />
          </Box>
          <Box sx={{ pl: 10, pt: 3, pr: 10, pb: 3 }}>
            <Typography> Description: </Typography>
            <TextField
              onChange={handleDescriptionChange}
              id="Vuln Description"
              multiline
              fullWidth
            />
          </Box>
          <Box sx={{ pl: 10, pt: 3, pr: 10, pb: 3 }}>
            <Typography> Severity: </Typography>
            <Slider
              defaultValue={2}
              min={1}
              max={4}
              step={1}
              marks={marks}
              onChange={handleSeverityChange}
            />
            {/* <Select onChange={handleSeverityChange} sx={{ width: '100%' }}>
              <MenuItem value={1}>
                <SeverityIcon severityLevel={1} /> Low
              </MenuItem>
              <MenuItem value={2}>
                <SeverityIcon severityLevel={2} /> Medium
              </MenuItem>
              <MenuItem value={3}>
                <SeverityIcon severityLevel={3} /> High
              </MenuItem>
              <MenuItem value={3}>
                <SeverityIcon severityLevel={4} /> Critical
              </MenuItem>
            </Select> */}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            pt: 5,
            pb: 5,
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {loading ? (
            <Box>
              <Typography> Loading Packages</Typography>
              <CircularProgress />
            </Box>
          ) : (
            <Autocomplete
              fullWidth
              options={vulnData}
              getOptionLabel={(option) => option.name}
              filterSelectedOptions
              onChange={(e, value) => handleChange(e, value)}
              renderInput={(params) => (
                <TextField {...params} label="Select Vulnerability" />
              )}
            />
          )}
        </Box>
        // <Grid>
        //   <Select value={selectedVuln} onChange={handleChange}>
        //     {vulnData.map((vuln) => {
        //       return (
        //         <MenuItem key={vuln.name} value={vuln.id} id="test">
        //           {vuln.name}
        //         </MenuItem>
        //       );
        //     })}
        //   </Select>
        // </Grid>
      )}
    </div>
  );
};

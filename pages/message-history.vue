<template>
  <v-app-bar title='Message history'>
    <template v-slot:append>
      <AccountPickList v-model='store.active_account_sid' :accounts_and_sub='store.accounts_and_sub'></AccountPickList>
      <Refresh :loading='state.loading' @click='refresh'></Refresh>
    </template>
  </v-app-bar>

  <v-main>
    <template v-if='state.loading'>
      <LoadingIndicatorRow></LoadingIndicatorRow>
    </template>
    <template v-else-if='state.error'>
      <ErrorAlertBox :text='state.error'></ErrorAlertBox>
    </template>
    <v-sheet v-else>
      <v-container>
        <v-form @submit.prevent='search'>
          <v-row class='align-center'>
            <v-col>
              <v-text-field v-model='state.form.from' label='From number' hide-details='auto' density='compact'
                placeholder='e.g. 16319999998'></v-text-field>
            </v-col>

            <v-col>
              <v-text-field v-model='state.form.to' label='To number' hide-details='auto' density='compact'
                placeholder='e.g. 16319999999'></v-text-field>
            </v-col>

            <v-col>
              <v-text-field v-model='state.form.from_date' label='From date' hide-details='auto' type='date'
                density='compact' placeholder='e.g. 2023-03-01'></v-text-field>
            </v-col>

            <v-col>
              <v-text-field v-model='state.form.to_date' label='To date' hide-details='auto' type='date' density='compact'
                placeholder='e.g. 2023-03-02'></v-text-field>
            </v-col>

            <v-col cols='12' md='1'>
              <v-btn type='submit' variant='outlined' color='primary' :loading='state.searching'
                :disabled='state.searching'>Search</v-btn>
            </v-col>

            <v-col cols='12' md='1' class="d-flex justify-center">
              <div v-if="state.exporting">
                <v-progress-circular indeterminate color="purple"></v-progress-circular>
              </div>
              <svg 
              v-else
              @click.native.prevent='exportMessages'
              xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="rgb(29, 111, 66)" class="bi bi-file-earmark-excel" viewBox="0 0 16 16"><path d="M5.884 6.68a.5.5 0 1 0-.768.64L7.349 10l-2.233 2.68a.5.5 0 0 0 .768.64L8 10.781l2.116 2.54a.5.5 0 0 0 .768-.641L8.651 10l2.233-2.68a.5.5 0 0 0-.768-.64L8 9.219l-2.116-2.54z"></path><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"></path>
            </svg>

            </v-col>
          </v-row>
        </v-form>
      </v-container>

      <template v-if='!state.records?.length'>
        <NoRecordsAlertBox></NoRecordsAlertBox>
      </template>

      <table v-else is='vue:v-table' @mouseup='tableMouseupHandler'>
        <thead>
          <tr>
            <th>SID</th>
            <th class='text-center'>Direction</th>
            <th>From</th>
            <th>To</th>
            <th>Body</th>
            <th>Date</th>
            <th class='text-center'>Segments</th>
            <th class='text-center'>Status</th>
            <th class='text-center'>Price</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for='r in state.records' :key='r.sid'>
            <td>
              <div style='max-width: 100px;' class='text-truncate' :title='r.sid'>{{ r.sid }}</div>
            </td>
            <td class='text-center'>{{ r.direction }}</td>
            <td>{{ r.from }}</td>
            <td>{{ r.to }}</td>
            <td>
              <div v-if='r.body'>{{ r.body }}</div>
              <template v-if='hasMedia(r.num_media)'>
                <template v-if='r.media_loading'>
                  <v-progress-circular indeterminate color='primary'></v-progress-circular>
                </template>
                <template v-else-if='r.media_list'>
                  <v-list lines='one'>
                    <v-list-item :href='media.link' target='_blank' v-for='media in r.media_list' :key='media.sid'
                      :title='media.sid' :subtitle='media.content_type'>
                      <template v-slot:prepend>
                        <v-icon color='primary' :icon='icon(media.content_type)'></v-icon>
                      </template>
                    </v-list-item>
                  </v-list>
                </template>
                <template v-else>
                  <v-btn variant='text' icon='mdi-attachment' @click='refreshMediaList(r.sid)'></v-btn>
                </template>
              </template>
            </td>
            <td :title='r.date_updated'>{{ localDate(r.date_updated) }}</td>
            <td class='text-center'>{{ r.num_segments }}</td>
            <td class='text-center'>
              <div>{{ r.status }}</div>
              <template v-if='r.error_message'>
                <span class='text-error'>{{ r.error_message }}</span>
              </template>
              <template v-if='r.error_code'>
                <div>
                  <v-chip class='my-1' size='small' color='error' :href='errorPageUrl(r.error_code)' target='_blank'>Error
                    code {{ r.error_code }}</v-chip>
                </div>
              </template>
            </td>
            <td class='text-center'>{{ price(r) }}</td>
          </tr>
        </tbody>
      </table>
      <v-layout v-if='state.next_page_url' v-intersect='loadMore'>
        <v-progress-linear indeterminate height='6'></v-progress-linear>
      </v-layout>
    </v-sheet>
  </v-main>
</template>

<script setup lang='ts'>
import * as dayjs from 'dayjs'

const store = useMainStore();

const state = ref({
  loading: true,
  searching: false,
  exporting: false,
  loading_more: false,
  form: {
    from: '',
    to: '',
    from_date: '',
    to_date: ''
  },
  error: '',
  records: [] as Array<any>,
  next_page_url: ''
});

function loadingOn() {
  state.value.loading = true;
}

function loadingOff() {
  state.value.loading = false;
}

function setNextPageUrl(value: string) {
  state.value.next_page_url = value;
}

async function loadData(refreshCache: boolean, { appendResults = false } = {}) {
  // const [error, result] = await callTwilioAPI({ path, refreshCache });
  const [error, result] = await twloFetchMessages({
    accountSid: store.active_account_sid,
    from: state.value.form.from,
    to: state.value.form.to,
    fromDate: state.value.form.from_date,
    toDate: state.value.form.to_date,
    nextPageUrl: state.value.next_page_url,
    refreshCache
  });

  state.value.error = error;

  if (error) {
    // when there is an error, pagination should stop
    setNextPageUrl('');
  } else {
    // when appendResults is asked, append to the records instead of replacing
    if (appendResults) {
      (result.messages as Array<any>).forEach(x => state.value.records.push(x));
    } else {
      state.value.records = result.messages;
    }

    // save next page uril for pagination
    setNextPageUrl(result.next_page_uri);
  }
}

function refresh() {
  setNextPageUrl('');

  loadingOn();

  loadData(true).then(() => loadingOff());
}

// load initial data
onMounted(() => {
  loadData(false).then(() => loadingOff());
});

// when store.active_account_sid changes, data should refreshed
watch(
  () => store.active_account_sid,
  async () => {
    loadingOn();

    setNextPageUrl('');

    await loadData(false);

    loadingOff();
  }
);

async function search() {
  setNextPageUrl('');
  const form = state.value.form;

  if (!form.from && !form.to && !form.from_date && !form.to_date) {
    return refresh();
  }

  state.value.searching = true;

  await loadData(true);

  state.value.searching = false;
}

async function exportMessages() {
  state.value.exporting = true;

  const headers = [
    {'sid':'SID'},{'direction':'Direction'},{'from':'From'},{'to':'To'},{'body':'Body'},{'date_updated':'Date'},{'num_segments':'Segments'},
    {'status':'Status'},{'price':'Price'},{'error_code':'Twilio error code'},{'error_message':'Twilio error message'}
  ]
 
  let next_page_uri = '';
  const { book } = prepareWorkBook();
  let sheet;
  do {
    const [error, result] = await twloFetchMessages({
      accountSid: store.active_account_sid,
      from: state.value.form.from,
      to: state.value.form.to,
      fromDate: state.value.form.from_date,
      toDate: state.value.form.to_date,
      pageSize: 1000,
      nextPageUrl: next_page_uri
    });
    if (error) {
      next_page_uri = '';
    } else {
      next_page_uri = result.next_page_uri;
    }
    let workbookRef = appendContentWorkBook({
      headers,
      book: book,
      sheet: sheet,
      sheet_name: 'messages_history',
      messages: result.messages.map((message: any) => {
        
        // concat price and unit
        message.price = `${message.price_unit} ${message.price}`
        
        for (const key of Object.keys(message)) {
          // cast date format to local date
          if (key == 'date_updated') {
            message[key] = localDate(message[key])
          }
     
        }
        return message
      })
    });
    sheet = workbookRef.sheet
  } while (next_page_uri);
  writeWorkBook({
    book,
    output: xlsxFileName()
  });
  state.value.exporting = false;
}

async function loadMore(isIntersecting: boolean) {
  if (
    !isIntersecting ||
    !state.value.next_page_url ||
    state.value.loading_more
  ) {
    return;
  }

  state.value.loading_more = true;

  await loadData(true, { appendResults: true });

  state.value.loading_more = false;
}

function price(record: any) {
  const formattedPrice = record.price ? formatPrice(record.price) : '-';

  return `${record.price_unit?.toUpperCase()} ${formattedPrice}`;
}

function hasMedia(val: string) {
  return parseInt(val || '0') > 0;
}

async function refreshMediaList(sid: string) {
  // find the message record
  const message = state.value.records.find(x => x.sid === sid);

  if (!message) {
    return;
  }

  // show spinner
  message.media_loading = true;

  const [_, result] = await callTwilioAPI({
    path: message.subresource_uris.media
  });

  if (result) {
    // for each media create a URL entry
    message.media_list = result.media_list;

    (message.media_list as Array<any>).forEach(m => {
      m.link = `https://api.twilio.com${m.uri.replace('.json', '')}`;
    });

    // hide spinner
    message.media_loading = false;
  }
}

function icon(contentType: string) {
  if (contentType.startsWith('image')) {
    return 'mdi-file-image';
  }

  if (contentType.startsWith('video')) {
    return 'mdi-file-video';
  }

  if (contentType.startsWith('audio')) {
    return 'mdi-file-music';
  }

  return 'mdi-file';
}

function errorPageUrl(code: any) {
  return `https://www.twilio.com/docs/errors/${code}`;
}

const xlsxFileName = () => {
  let filename_parts = ['messages']
  if (state.value.form.from) {
    filename_parts.push(state.value.form.from)
  }
  if (state.value.form.to) {
    filename_parts.push(state.value.form.to)
  }
  if (state.value.form.from_date) {
    filename_parts.push(dayjs(state.value.form.from_date).format('YYYYMMDD'))
  }
  if (state.value.form.to_date) {
    filename_parts.push(dayjs(state.value.form.to_date).format('YYYYMMDD'))
  }
  filename_parts.push(dayjs().format('YYYYMMDDHHmmSS'))
  return `${filename_parts.join('_')}.xlsx`
}

function tableMouseupHandler() {
  highlightSelectedText(
    (document.getElementsByTagName('table')?.item(0) as Node) || undefined
  );
}
</script>